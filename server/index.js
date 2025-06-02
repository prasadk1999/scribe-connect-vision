import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:8080",
    methods: ["GET", "POST"]
  }
});
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access denied' });

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ error: 'Invalid token' });
  }
};

// User registration
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, name, phone, userType, location } = req.body;

    // Validate input
    if (!email || !password || !name || !phone || !userType) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user exists
    const userExists = await prisma.user.findUnique({ where: { email } });
    if (userExists) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with location
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone,
        userType,
        location: location ? {
          create: {
            latitude: location.latitude,
            longitude: location.longitude,
            address: location.address
          }
        } : undefined
      },
      include: {
        location: true
      }
    });

    // Generate token
    const token = jwt.sign({ id: user.id }, JWT_SECRET);

    res.json({ token, user: { ...user, password: undefined } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// User login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: { location: true }
    });

    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    // Generate token
    const token = jwt.sign({ id: user.id }, JWT_SECRET);

    res.json({ token, user: { ...user, password: undefined } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create exam request
app.post('/api/exam-requests', authenticateToken, async (req, res) => {
  try {
    const { examName, examDate, duration, subject } = req.body;
    const studentId = req.user.id;

    const examRequest = await prisma.examRequest.create({
      data: {
        examName,
        examDate: new Date(examDate),
        duration,
        subject,
        status: 'pending',
        studentId
      }
    });

    // Find nearby writers
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      include: { location: true }
    });

    if (student?.location) {
      // Find writers within 10km radius
      const nearbyWriters = await prisma.user.findMany({
        where: {
          userType: 'writer',
          availability: true,
          location: {
            // Simple distance calculation for demo
            latitude: {
              gte: student.location.latitude - 0.1,
              lte: student.location.latitude + 0.1
            },
            longitude: {
              gte: student.location.longitude - 0.1,
              lte: student.location.longitude + 0.1
            }
          }
        }
      });

      // Create notifications for nearby writers
      for (const writer of nearbyWriters) {
        await prisma.notification.create({
          data: {
            type: 'request',
            content: `New exam request: ${examName} on ${examDate}`,
            userId: writer.id
          }
        });

        // Emit socket event to writer
        io.to(writer.id).emit('newExamRequest', examRequest);
      }
    }

    res.json(examRequest);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Accept/Reject exam request
app.put('/api/exam-requests/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const writerId = req.user.id;

    const examRequest = await prisma.examRequest.update({
      where: { id },
      data: {
        status,
        writerId: status === 'accepted' ? writerId : null
      },
      include: {
        student: true
      }
    });

    // Create notification for student
    await prisma.notification.create({
      data: {
        type: 'request',
        content: `Your exam request has been ${status}`,
        userId: examRequest.studentId
      }
    });

    // Emit socket event to student
    io.to(examRequest.studentId).emit('examRequestUpdate', examRequest);

    res.json(examRequest);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join user's room
  socket.on('join', (userId) => {
    socket.join(userId);
  });

  // Handle chat messages
  socket.on('sendMessage', async ({ examRequestId, senderId, content }) => {
    try {
      const message = await prisma.message.create({
        data: {
          content,
          senderId,
          examRequestId
        },
        include: {
          sender: true
        }
      });

      const examRequest = await prisma.examRequest.findUnique({
        where: { id: examRequestId },
        select: { studentId: true, writerId: true }
      });

      // Emit message to both student and writer
      if (examRequest) {
        io.to(examRequest.studentId).emit('newMessage', message);
        if (examRequest.writerId) {
          io.to(examRequest.writerId).emit('newMessage', message);
        }
      }
    } catch (error) {
      console.error('Message error:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});