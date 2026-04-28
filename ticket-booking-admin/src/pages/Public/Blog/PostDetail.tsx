import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Container, Typography, Chip, Avatar, IconButton,
  TextField, Button, Divider, CircularProgress, Alert,
  ImageList, ImageListItem, Tooltip,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import { useNavigate, useParams } from 'react-router-dom';
import PublicNavbar from '../../../components/public/PublicNavbar';
import BlogService, { BlogPostDetail, BlogComment } from '../../../services/BlogService';
import { useAuth } from '../../../context/AuthContext';

const PostDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isCustomerUser } = useAuth();
  const commentInputRef = useRef<HTMLInputElement>(null);

  const [post, setPost] = useState<BlogPostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [likingInProgress, setLikingInProgress] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const isLoggedIn = isAuthenticated() && isCustomerUser();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    BlogService.getPostDetail(id)
      .then((data) => {
        setPost(data);
        setLiked(data.likedByCurrentUser);
        setLikeCount(data.likeCount);
        if (data.images.length > 0) setSelectedImage(data.images[0].imageBase64);
      })
      .catch(() => setError('Failed to load post.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleLike = async () => {
    if (!isLoggedIn) { navigate('/login'); return; }
    if (likingInProgress || !id) return;
    setLikingInProgress(true);
    try {
      const nowLiked = await BlogService.toggleLike(id);
      setLiked(nowLiked);
      setLikeCount((prev) => (nowLiked ? prev + 1 : Math.max(0, prev - 1)));
    } catch (e) {
      console.error('Like failed', e);
    } finally {
      setLikingInProgress(false);
    }
  };

  const handleComment = async () => {
    if (!isLoggedIn) { navigate('/login'); return; }
    if (!commentText.trim() || !id) return;
    setSubmittingComment(true);
    try {
      const newComment = await BlogService.addComment(id, commentText.trim());
      setPost((prev) => prev ? {
        ...prev,
        comments: [...(prev.comments || []), newComment],
        commentCount: prev.commentCount + 1,
      } : prev);
      setCommentText('');
    } catch (e) {
      console.error('Comment failed', e);
    } finally {
      setSubmittingComment(false);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  if (loading) return (
    <Box sx={{ bgcolor: '#0d0d0d', minHeight: '100vh' }}>
      <PublicNavbar />
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 20 }}>
        <CircularProgress sx={{ color: '#ff1955' }} />
      </Box>
    </Box>
  );

  if (error || !post) return (
    <Box sx={{ bgcolor: '#0d0d0d', minHeight: '100vh' }}>
      <PublicNavbar />
      <Container sx={{ pt: 10 }}>
        <Alert severity="error">{error || 'Post not found.'}</Alert>
      </Container>
    </Box>
  );

  return (
    <Box sx={{ bgcolor: '#0d0d0d', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <PublicNavbar />

      {/* Hero Image */}
      {selectedImage && (
        <Box sx={{ width: '100%', maxHeight: 500, overflow: 'hidden', position: 'relative' }}>
          <Box component="img" src={selectedImage} alt={post.title}
            sx={{ width: '100%', height: 500, objectFit: 'cover', filter: 'brightness(0.65)' }} />
          <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'linear-gradient(to top, rgba(13,13,13,1) 0%, transparent 100%)', height: 200 }} />
        </Box>
      )}

      <Container maxWidth="lg" sx={{ py: 5, flexGrow: 1 }}>
        {/* Back Button */}
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/blog')}
          sx={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'Raleway, sans-serif', mb: 3, '&:hover': { color: '#ff1955' } }}>
          Back to Blog
        </Button>

        <Box sx={{ display: 'flex', gap: 4, flexDirection: { xs: 'column', md: 'row' } }}>
          {/* Main Content */}
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Chip label={post.category}
              sx={{ bgcolor: 'rgba(255,25,85,0.15)', color: '#ff1955', fontFamily: 'Raleway, sans-serif', fontWeight: 700, mb: 2 }} />
            <Typography variant="h3" sx={{ color: '#fff', fontFamily: 'Raleway, sans-serif', fontWeight: 900, fontSize: { xs: '1.8rem', md: '2.5rem' }, mb: 2, lineHeight: 1.2 }}>
              {post.title}
            </Typography>
            {post.summary && (
              <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'Raleway, sans-serif', fontSize: '1.1rem', mb: 3, fontStyle: 'italic', borderLeft: '3px solid #ff1955', pl: 2 }}>
                {post.summary}
              </Typography>
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
              <Avatar sx={{ bgcolor: '#ff1955', width: 36, height: 36, fontSize: '0.9rem' }}>T</Avatar>
              <Box>
                <Typography sx={{ color: '#fff', fontFamily: 'Raleway, sans-serif', fontWeight: 700, fontSize: '0.9rem' }}>Ticketer.lk Team</Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'Raleway, sans-serif', fontSize: '0.8rem' }}>{formatDate(post.createdAt)}</Typography>
              </Box>
              {/* Like / Comment counts */}
              <Box sx={{ ml: 'auto', display: 'flex', gap: 2, alignItems: 'center' }}>
                <Tooltip title={isLoggedIn ? (liked ? 'Unlike' : 'Like') : 'Login to like'}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer' }} onClick={handleLike}>
                    {liked ? (
                      <FavoriteIcon sx={{ color: '#ff1955', fontSize: 22, transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.2)' } }} />
                    ) : (
                      <FavoriteBorderIcon sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 22, '&:hover': { color: '#ff1955' } }} />
                    )}
                    <Typography sx={{ color: liked ? '#ff1955' : 'rgba(255,255,255,0.5)', fontFamily: 'Raleway, sans-serif', fontSize: '0.9rem', fontWeight: 700 }}>
                      {likeCount}
                    </Typography>
                  </Box>
                </Tooltip>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                  onClick={() => commentInputRef.current?.focus()}>
                  <ChatBubbleOutlineIcon sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 20, cursor: 'pointer', '&:hover': { color: '#fff' } }} />
                  <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'Raleway, sans-serif', fontSize: '0.9rem' }}>
                    {post.commentCount}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Image Gallery Thumbnails */}
            {post.images.length > 1 && (
              <Box sx={{ mb: 4 }}>
                <ImageList sx={{ width: '100%', height: 120 }} cols={Math.min(post.images.length, 6)} rowHeight={120}>
                  {post.images.map((img) => (
                    <ImageListItem key={img.imageId}
                      onClick={() => setSelectedImage(img.imageBase64)}
                      sx={{ cursor: 'pointer', borderRadius: 1, overflow: 'hidden',
                        border: selectedImage === img.imageBase64 ? '2px solid #ff1955' : '2px solid transparent',
                        transition: 'border 0.2s' }}>
                      <img src={img.imageBase64} alt="" style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                    </ImageListItem>
                  ))}
                </ImageList>
              </Box>
            )}

            {/* Post Content */}
            {post.content && (
              <Box sx={{ color: 'rgba(255,255,255,0.8)', fontFamily: 'Raleway, sans-serif', fontSize: '1rem', lineHeight: 1.8, mb: 5,
                '& p': { mb: 2 }, '& h2': { color: '#fff', fontWeight: 700, mt: 3, mb: 1 },
                whiteSpace: 'pre-wrap' }}>
                {post.content}
              </Box>
            )}

            <Divider sx={{ borderColor: '#222', mb: 4 }} />

            {/* Big Like Button */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 5 }}>
              <IconButton onClick={handleLike} disabled={likingInProgress}
                sx={{ bgcolor: liked ? 'rgba(255,25,85,0.15)' : 'rgba(255,255,255,0.05)',
                  border: `2px solid ${liked ? '#ff1955' : '#333'}`,
                  p: 1.5, transition: 'all 0.3s',
                  '&:hover': { bgcolor: 'rgba(255,25,85,0.25)', borderColor: '#ff1955' } }}>
                {liked ? <FavoriteIcon sx={{ color: '#ff1955', fontSize: 28 }} /> : <FavoriteBorderIcon sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 28 }} />}
              </IconButton>
              <Typography sx={{ color: liked ? '#ff1955' : 'rgba(255,255,255,0.5)', fontFamily: 'Raleway, sans-serif', fontSize: '1rem', fontWeight: 700 }}>
                {likeCount} {likeCount === 1 ? 'person liked' : 'people liked'} this
              </Typography>
            </Box>

            {/* Comments Section */}
            <Typography variant="h5" sx={{ color: '#fff', fontFamily: 'Raleway, sans-serif', fontWeight: 800, mb: 3 }}>
              💬 Comments ({post.commentCount})
            </Typography>

            {/* Comment Input */}
            {isLoggedIn ? (
              <Box sx={{ display: 'flex', gap: 2, mb: 4, alignItems: 'flex-start' }}>
                <Avatar sx={{ bgcolor: '#ff1955', width: 36, height: 36, mt: 0.5 }}>U</Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <TextField
                    inputRef={commentInputRef}
                    fullWidth multiline rows={2}
                    placeholder="Share your thoughts..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) handleComment(); }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        color: '#fff', bgcolor: '#161616', borderRadius: 2,
                        '& fieldset': { borderColor: '#333' },
                        '&:hover fieldset': { borderColor: '#555' },
                        '&.Mui-focused fieldset': { borderColor: '#ff1955' },
                      },
                    }}
                    InputProps={{
                      endAdornment: (
                        <Button onClick={handleComment} disabled={submittingComment || !commentText.trim()}
                          sx={{ minWidth: 'auto', p: 1, color: '#ff1955', '&:disabled': { color: '#555' } }}>
                          {submittingComment ? <CircularProgress size={18} sx={{ color: '#ff1955' }} /> : <SendIcon />}
                        </Button>
                      )
                    }}
                  />
                  <Typography sx={{ color: '#444', fontFamily: 'Raleway, sans-serif', fontSize: '0.75rem', mt: 0.5 }}>
                    Press Ctrl+Enter to post
                  </Typography>
                </Box>
              </Box>
            ) : (
              <Box sx={{ mb: 4, p: 2.5, bgcolor: '#161616', borderRadius: 2, border: '1px dashed #333', textAlign: 'center' }}>
                <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'Raleway, sans-serif', fontSize: '0.9rem', mb: 1.5 }}>
                  Join the conversation — log in to comment and like posts
                </Typography>
                <Button variant="contained" onClick={() => navigate('/login')}
                  sx={{ bgcolor: '#ff1955', fontFamily: 'Raleway, sans-serif', textTransform: 'none', fontWeight: 700,
                    '&:hover': { bgcolor: '#e01545' } }}>
                  Log In
                </Button>
              </Box>
            )}

            {/* Comment List */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {(post.comments || []).length === 0 ? (
                <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'Raleway, sans-serif', textAlign: 'center', py: 3 }}>
                  No comments yet. Be the first to share your thoughts!
                </Typography>
              ) : (
                [...(post.comments || [])].reverse().map((comment) => (
                  <Box key={comment.commentId}
                    sx={{ display: 'flex', gap: 2, p: 2, bgcolor: '#161616', borderRadius: 2, border: '1px solid #222',
                      transition: 'border 0.2s', '&:hover': { border: '1px solid #333' } }}>
                    <Avatar sx={{ bgcolor: '#ff1955', width: 36, height: 36, fontSize: '0.85rem', flexShrink: 0 }}>
                      {comment.userName?.[0]?.toUpperCase() || 'U'}
                    </Avatar>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography sx={{ color: '#fff', fontFamily: 'Raleway, sans-serif', fontWeight: 700, fontSize: '0.9rem' }}>
                          {comment.userName}
                        </Typography>
                        <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'Raleway, sans-serif', fontSize: '0.75rem' }}>
                          · {timeAgo(comment.createdAt)}
                        </Typography>
                      </Box>
                      <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'Raleway, sans-serif', fontSize: '0.9rem', lineHeight: 1.5, wordBreak: 'break-word' }}>
                        {comment.content}
                      </Typography>
                    </Box>
                  </Box>
                ))
              )}
            </Box>
          </Box>
        </Box>
      </Container>

      <Box component="footer" sx={{ bgcolor: 'transparent', color: 'rgba(255,255,255,0.3)', py: 3, textAlign: 'center', fontFamily: 'Raleway, sans-serif', fontSize: '0.85rem' }}>
        © 2026 Ticketer.lk — All Rights Reserved
      </Box>
    </Box>
  );
};

export default PostDetail;
