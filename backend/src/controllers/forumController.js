const prisma = require('../config/db');

const shapePost = (post) => ({ ...post, tags: post.tags ? post.tags.split(',').filter(Boolean) : [], comments: post.comments || [] });

const getPosts = async (req, res) => {
  const posts = await prisma.communityPost.findMany({ include: { comments: { orderBy: { createdAt: 'asc' } } }, orderBy: { createdAt: 'desc' } });
  return res.json({ posts: posts.map(shapePost) });
};

const addPost = async (req, res) => {
  const { title, content, tags = [] } = req.body || {};
  const author = String(req.user?.name || '').trim();
  if (!author || !title?.trim() || !content?.trim()) return res.status(400).json({ message: 'Thiếu thông tin bài viết.' });
  const post = await prisma.communityPost.create({ data: { author, title: title.trim().slice(0, 160), content: content.trim().slice(0, 5000), tags: Array.isArray(tags) ? tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 10).join(',') : String(tags).slice(0, 500) } });
  return res.status(201).json({ message: 'Đã đăng bài thành công.', post: shapePost({ ...post, comments: [] }) });
};

const addComment = async (req, res) => {
  const postId = Number(req.params.postId);
  const content = req.body?.content;
  const author = String(req.user?.name || '').trim();
  if (!Number.isInteger(postId) || !author || !content?.trim()) return res.status(400).json({ message: 'Thiếu thông tin bình luận.' });
  const post = await prisma.communityPost.findUnique({ where: { id: postId } });
  if (!post) return res.status(404).json({ message: 'Bài viết không tồn tại.' });
  const comment = await prisma.comment.create({ data: { postId, author, content: content.trim().slice(0, 2000) } });
  return res.status(201).json({ message: 'Đã thêm bình luận.', comment });
};

module.exports = { getPosts, addPost, addComment };
