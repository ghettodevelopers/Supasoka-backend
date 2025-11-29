const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if it's an admin token
    if (decoded.type === 'admin') {
      const admin = await prisma.admin.findUnique({
        where: { id: decoded.id }
      });
      
      if (!admin || !admin.isActive) {
        return res.status(401).json({ error: 'Invalid admin token.' });
      }
      
      req.admin = admin;
      req.userType = 'admin';
    } else {
      // Regular user token
      const userId = decoded.userId || decoded.id;
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid user token.' });
      }
      
      req.user = user;
      req.userType = 'user';
    }
    
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token.' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.userType !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
};

module.exports = { authMiddleware, adminOnly };
