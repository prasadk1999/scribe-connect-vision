import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';

// Enable source maps for debugging
import sourceMapSupport from 'source-map-support';
sourceMapSupport.install();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:8081"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});
const prisma = new PrismaClient();

// Debug logging
const debug = (message, data) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
};

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:8080","http://localhost:8081"],
  credentials: true
}));
app.use(express.json());

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Test database connection
prisma.$connect()
  .then(() => {
    console.log('Successfully connected to database');
  })
  .catch((error) => {
    console.error('Failed to connect to database:', error);
    process.exit(1);
  });

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
            address: location.address,
            city: location.city,
            state: location.state,
            country: location.country,
            postalCode: location.postalCode
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
    const token = jwt.sign(
      { id: user.id, name: user.name, userType: user.userType },
      JWT_SECRET
    );

    res.json({ token, user: { ...user, password: undefined } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Exam Request Routes
app.post('/api/exam-requests', authenticateToken, async (req, res) => {
  const { examName, examDate, duration, subject } = req.body;
  const studentId = req.user.id; 

  if (!examName || !examDate || !duration || !subject) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const newRequest = await prisma.examRequest.create({
      data: {
        studentId,
        examName,
        examDate: new Date(examDate),
        duration,
        subject,
        status: 'PENDING', // Initially pending, no writer assigned
      },
      include: {
        student: { // Include student details for the broadcast
          select: { name: true, email: true },
        },
      },
    });

    // Broadcast the new request to all connected clients (writers)
    io.emit('new-exam-request', newRequest);
    console.log('Emitted new-exam-request:', newRequest);

    res.status(201).json(newRequest);
  } catch (error) {
    console.error('Failed to create exam request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Accept/Reject exam request
app.put('/api/exam-requests/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;
  const writerId = req.user.id;

  if (action !== 'accept' && action !== 'reject') {
    return res.status(400).json({ error: 'Invalid action.' });
  }

  try {
    const request = await prisma.examRequest.findUnique({ where: { id } });

    if (!request) {
      return res.status(404).json({ error: 'Request not found.' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ error: 'This request has already been handled.' });
    }
    
    // For rejections, we don't need to do anything with the request itself,
    // a real application might log this action, but for now we just confirm.
    // The request remains PENDING for other writers.
    if (action === 'reject') {
      return res.status(200).json({ message: 'You have rejected this request.' });
    }

    // If accepted, update the request
    const updatedRequest = await prisma.examRequest.update({
      where: { id },
      data: {
        writerId: writerId,
        status: 'ACCEPTED',
      },
      include: { // Include details for the broadcast
          student: { select: { name: true, email: true } },
          writer: { select: { name: true, email: true } },
      },
    });

    // Notify all clients that this request has been updated (and is off the market)
    io.emit('exam-request-updated', updatedRequest);
    console.log('Emitted exam-request-updated:', updatedRequest);

    res.json(updatedRequest);
  } catch (error) {
    console.error('Failed to update exam request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//Search writers
/* app.get('/api/search-writers', authenticateToken, async (req, res) => {
  try {
    const { examDate } = req.query;
    
    // Get all available writers without checking specialties
    const writers = await prisma.user.findMany({
      where: {
        userType: 'writer',
        availability: true
      },
      include: {
        location: true
      }
    });

    // Get writers' ratings and completed requests
    const writersWithStats = await Promise.all(writers.map(async (writer) => {
      const completedRequests = await prisma.examRequest.count({
        where: {
          writerId: writer.id,
          status: 'completed'
        }
      });

      return {
        id: writer.id,
        name: writer.name,
        rating: writer.rating || 0,
        specialties: writer.specialties ? writer.specialties.split(',') : [],
        experience: `${completedRequests} completed requests`,
        location: writer.location,
        availability: writer.availability
      };
    }));

    res.json(writersWithStats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});
 */
// Get writer's exam requests
app.get('/api/writer/requests', authenticateToken, async (req, res) => {
  try {
    const writerId = req.user.id;

    // Verify the user is a writer
    const writer = await prisma.user.findUnique({
      where: { id: writerId }
    });

    if (!writer || writer.userType !== 'writer') {
      return res.status(403).json({ error: 'Access denied. User is not a writer.' });
    }

    // Get all requests for this writer
    const requests = await prisma.examRequest.findMany({
      where: {
        OR: [
          { writerId: writerId }, // Requests assigned to this writer
          { 
            status: 'pending',
            writerId: null // Pending requests not yet assigned
          }
        ]
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            location: true
          }
        },
        messages: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                userType: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(requests);
  } catch (error) {
    console.error('Error fetching writer requests:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get exam request details
app.get('/api/exam-requests/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const request = await prisma.examRequest.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            location: true
          }
        },
        writer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            location: true
          }
        },
        messages: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                userType: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Verify user has access to this request
    if (request.studentId !== req.user.id && request.writerId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(request);
  } catch (error) {
    console.error('Error fetching request:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create message
app.post('/api/messages', authenticateToken, async (req, res) => {
  try {
    const { content, examRequestId } = req.body;
    const senderId = req.user.id;

    // Verify the exam request exists and user has access
    const examRequest = await prisma.examRequest.findUnique({
      where: { id: examRequestId },
      select: { studentId: true, writerId: true }
    });

    if (!examRequest) {
      return res.status(404).json({ error: 'Exam request not found' });
    }

    if (examRequest.studentId !== senderId && examRequest.writerId !== senderId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        content,
        senderId,
        examRequestId
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            userType: true
          }
        }
      }
    });

    // Emit socket event
    const recipientId = senderId === examRequest.studentId ? examRequest.writerId : examRequest.studentId;
    if (recipientId) {
      io.to(recipientId).emit('newMessage', message);
    }

    res.json(message);
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get student's exam requests
app.get('/api/student/requests', authenticateToken, async (req, res) => {
  try {
    const studentId = req.user.id;

    // Verify the user is a student
    const student = await prisma.user.findUnique({
      where: { id: studentId }
    });

    if (!student || student.userType !== 'student') {
      return res.status(403).json({ error: 'Access denied. User is not a student.' });
    }

    // Get all requests for this student
    const requests = await prisma.examRequest.findMany({
      where: {
        studentId: studentId
      },
      include: {
        writer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        messages: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                userType: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(requests);
  } catch (error) {
    console.error('Error fetching student requests:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Test route for debugging
app.get('/api/test', (req, res) => {
  debug('Test route hit');
  res.json({ message: 'Test successful' });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('joinRoom', (examRequestId) => {
    socket.join(examRequestId);
    console.log(`User ${socket.id} joined room ${examRequestId}`);
  });

  socket.on('sendMessage', async ({ examRequestId, senderId, content }) => {
    try {
      const message = await prisma.message.create({
        data: {
          examRequestId,
          senderId,
          content,
        },
        include: {
          sender: {
            select: { id: true, name: true },
          },
        },
      });
      // Broadcast the new message to the room
      io.to(examRequestId).emit('newMessage', message);
    } catch (error) {
      console.error('Failed to save or broadcast message:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Add server startup logging
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.IO server initialized`);
});

app.get('/api/exam-requests', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let requests;
    if (user.userType === 'student') {
      // Students see all their own requests
      requests = await prisma.examRequest.findMany({
        where: { studentId: userId },
        include: {
          student: { select: { name: true } },
          writer: { select: { name: true } },
        },
        orderBy: { examDate: 'desc' },
      });
    } else if (user.userType === 'writer') {
      // Writers see all pending requests AND requests they've accepted
      requests = await prisma.examRequest.findMany({
        where: {
          OR: [
            { status: 'PENDING', writerId: null }, // Available to all writers
            { writerId: userId }, // Accepted by this specific writer
          ],
        },
        include: {
          student: { select: { name: true } },
        },
        orderBy: { examDate: 'asc' },
      });
    } else {
      return res.status(403).json({ error: 'Invalid user type' });
    }

    res.json(requests);
  } catch (error) {
    console.error('Failed to get exam requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/exam-requests/:id/messages', authenticateToken, async (req, res) => {
  try {
    const { id: examRequestId } = req.params;
    const messages = await prisma.message.findMany({
      where: { examRequestId },
      include: {
        sender: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json(messages);
  } catch (error) {
    console.error('Failed to fetch messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single exam request by ID
app.get('/api/exam-requests/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const request = await prisma.examRequest.findUnique({
      where: { id },
      include: {
        student: { select: { name: true } },
        writer: { select: { name: true } },
      },
    });

    if (!request) {
      return res.status(404).json({ error: 'Exam request not found' });
    }

    // Ensure the user is part of this request
    const userId = req.user.id;
    if (request.studentId !== userId && request.writerId !== userId) {
      return res.status(403).json({ error: 'You are not authorized to view this chat.' });
    }

    res.json(request);
  } catch (error) {
    console.error('Failed to get exam request details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});