const express = require('express');
const { getPosts, addPost, addComment } = require('../controllers/forumController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/posts', getPosts);
router.post('/posts', requireAuth, addPost);
router.post('/posts/:postId/comments', requireAuth, addComment);

module.exports = router;
