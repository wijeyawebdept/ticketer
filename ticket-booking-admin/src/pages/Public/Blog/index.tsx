import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Container, Typography, Card, CardMedia,
  Chip, Button, CircularProgress, Alert, Pagination, Drawer, IconButton, TextField, Avatar
} from '@mui/material';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import CloseIcon from '@mui/icons-material/Close';


import PublicNavbar from '../../../components/public/PublicNavbar';
import PublicFooter from '../../../components/public/PublicFooter';
import BlogService, { BlogPostSummary, BlogComment } from '../../../services/BlogService';
import { useAuth } from '../../../context/AuthContext';
import FavoriteIcon from '@mui/icons-material/Favorite';

const CommentItem = ({ 
  comment, timeAgo, onLike, onReplyClick, replyingToId, replyText, setReplyText, onSubmitReply, submittingReply, onCancelReply, currentUserId, isAuthenticated
}: any) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Avatar sx={{ bgcolor: '#ff1955', width: 40, height: 40, fontSize: '1rem' }}>
          {comment.userName?.[0]?.toUpperCase() || 'U'}
        </Avatar>
        <Box sx={{ flexGrow: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography noWrap sx={{ color: '#f1f1f1', fontFamily: 'Roboto, sans-serif', fontWeight: 600, fontSize: '0.85rem', flexShrink: 1, minWidth: 0 }}>
              @{comment.userName.replace(/\s+/g, '').toLowerCase()}
            </Typography>
            {comment.isAdmin && (
              <Chip label="Admin" size="small" sx={{ height: 16, fontSize: '0.6rem', bgcolor: '#ff1955', color: '#fff', fontWeight: 'bold', flexShrink: 0 }} />
            )}
            <Typography sx={{ color: '#aaaaaa', fontFamily: 'Roboto, sans-serif', fontSize: '0.75rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {timeAgo(comment.createdAt)}
            </Typography>
          </Box>
          <Typography sx={{ color: '#f1f1f1', fontFamily: 'Roboto, sans-serif', fontSize: '0.9rem', lineHeight: 1.4 }}>
            {comment.content}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mt: 1, alignItems: 'center' }}>
             <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', cursor: 'pointer' }} onClick={() => onLike(comment.commentId)}>
               {comment.likedByCurrentUser ? (
                 <FavoriteIcon sx={{ fontSize: 14, color: '#ff1955' }} />
               ) : (
                 <FavoriteBorderIcon sx={{ fontSize: 14, color: '#f1f1f1' }} />
               )}
               {comment.likeCount > 0 && <Typography sx={{ color: '#aaa', fontSize: '0.75rem' }}>{comment.likeCount}</Typography>}
             </Box>
             <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', cursor: 'pointer' }} onClick={() => onReplyClick(comment.commentId)}>
               <ChatBubbleOutlineIcon sx={{ fontSize: 14, color: '#f1f1f1' }} />
             </Box>
          </Box>

          {replyingToId === comment.commentId && isAuthenticated && (
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column' }}>
              <TextField
                fullWidth
                variant="standard"
                placeholder="Add a reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                sx={{
                  '& .MuiInput-root': {
                    color: '#f1f1f1', fontSize: '0.9rem', fontFamily: 'Roboto, sans-serif',
                    '&:before': { borderBottom: '1px solid #3f3f3f' },
                    '&:hover:not(.Mui-disabled):before': { borderBottom: '1px solid #717171' },
                    '&:after': { borderBottom: '1px solid #f1f1f1' },
                  },
                }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                <Button onClick={onCancelReply} sx={{ color: '#f1f1f1', borderRadius: 5, textTransform: 'none', px: 2, fontSize: '0.8rem' }}>Cancel</Button>
                <Button 
                  onClick={() => onSubmitReply(comment.commentId)}
                  disabled={submittingReply || !replyText.trim()}
                  sx={{ color: '#1a1a1a', bgcolor: '#3ea6ff', borderRadius: 5, textTransform: 'none', px: 2, ml: 1, fontSize: '0.8rem', '&:hover': { bgcolor: '#65b8ff' }, '&:disabled': { bgcolor: '#272727', color: '#717171' } }}
                >
                  {submittingReply ? <CircularProgress size={16} sx={{ color: '#717171' }} /> : 'Reply'}
                </Button>
              </Box>
            </Box>
          )}

          {comment.replies && comment.replies.length > 0 && (
            <Box sx={{ mt: 2, pl: 2, borderLeft: '2px solid #333' }}>
              {comment.replies.map((reply: any) => (
                <Box key={reply.commentId} sx={{ mt: 2 }}>
                  <CommentItem 
                    comment={reply} 
                    timeAgo={timeAgo} 
                    onLike={onLike} 
                    onReplyClick={onReplyClick} 
                    replyingToId={replyingToId} 
                    replyText={replyText} 
                    setReplyText={setReplyText} 
                    onSubmitReply={onSubmitReply} 
                    submittingReply={submittingReply} 
                    onCancelReply={onCancelReply}
                    currentUserId={currentUserId}
                    isAuthenticated={isAuthenticated}
                  />
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};


const Blog: React.FC = () => {
  // const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [posts, setPosts] = useState<BlogPostSummary[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [drawerComments, setDrawerComments] = useState<BlogComment[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [expandedContent, setExpandedContent] = useState<string>('');
  const [expandedLoading, setExpandedLoading] = useState(false);

  const handleReadMore = async (postId: string) => {
    if (expandedPostId === postId) {
      setExpandedPostId(null);
      return;
    }
    setExpandedPostId(postId);
    setExpandedLoading(true);
    try {
      const detail = await BlogService.getPostDetail(postId);
      setExpandedContent(detail.content || '');
    } catch (e) {
      setExpandedContent('Failed to load content.');
    } finally {
      setExpandedLoading(false);
    }
  };

  const handleOpenComments = async (postId: string) => {
    setDrawerOpen(true);
    setActiveCommentPostId(postId);
    setDrawerLoading(true);
    setDrawerComments([]);
    setCommentText('');
    try {
      const detail = await BlogService.getPostDetail(postId);
      setDrawerComments(detail.comments || []);
    } catch (e) {
      console.error('Failed to load comments');
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleCloseComments = () => {
    setDrawerOpen(false);
    setActiveCommentPostId(null);
  };

  const handleAddComment = async (parentCommentId?: string) => {
    if (!activeCommentPostId) return;
    
    if (parentCommentId) {
      if (!replyText.trim()) return;
      setSubmittingReply(true);
      try {
        const newReply = await BlogService.addComment(activeCommentPostId, replyText.trim(), parentCommentId);
        
        // Recursive update function
        const updateReplies = (comments: BlogComment[]): BlogComment[] => {
          return comments.map(c => {
            if (c.commentId === parentCommentId) {
              return { ...c, replies: [...(c.replies || []), newReply] };
            }
            if (c.replies && c.replies.length > 0) {
              return { ...c, replies: updateReplies(c.replies) };
            }
            return c;
          });
        };
        
        setDrawerComments(prev => updateReplies(prev));
        setReplyText('');
        setReplyingToId(null);
      } catch (error) {
        console.error('Failed to add reply', error);
      } finally {
        setSubmittingReply(false);
      }
    } else {
      if (!commentText.trim()) return;
      setSubmittingComment(true);
      try {
        const newComment = await BlogService.addComment(activeCommentPostId, commentText.trim());
        setDrawerComments(prev => [...prev, newComment]);
        setCommentText('');
        setPosts(prev => prev.map(p => p.postId === activeCommentPostId ? { ...p, commentCount: p.commentCount + 1 } : p));
      } catch (error) {
        console.error('Failed to add comment', error);
      } finally {
        setSubmittingComment(false);
      }
    }
  };

  const handleToggleCommentLike = async (commentId: string) => {
    if (!isAuthenticated()) {
      alert('Please log in to like comments.');
      return;
    }
    try {
      const isLiked = await BlogService.toggleCommentLike(commentId);
      
      const updateLikes = (comments: BlogComment[]): BlogComment[] => {
        return comments.map(c => {
          if (c.commentId === commentId) {
            return { ...c, likedByCurrentUser: isLiked, likeCount: isLiked ? c.likeCount + 1 : Math.max(0, c.likeCount - 1) };
          }
          if (c.replies && c.replies.length > 0) {
            return { ...c, replies: updateLikes(c.replies) };
          }
          return c;
        });
      };
      
      setDrawerComments(prev => updateLikes(prev));
    } catch (error) {
      console.error('Failed to toggle like');
    }
  };

  const handleLikePost = async (postId: string) => {
    if (!isAuthenticated()) {
      alert('Please log in to like posts.');
      return;
    }
    try {
      const isLiked = await BlogService.toggleLike(postId);
      setPosts(prev => prev.map(p => {
        if (p.postId === postId) {
          return { ...p, likeCount: isLiked ? p.likeCount + 1 : Math.max(0, p.likeCount - 1) };
        }
        return p;
      }));
    } catch (e) {
      console.error('Failed to toggle like');
    }
  };


  const timeAgo = (dateStr: string) => {
    let dStr = dateStr;
    if (dStr && !dStr.endsWith('Z')) dStr += 'Z';
    const seconds = Math.floor((new Date().getTime() - new Date(dStr).getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + 'y ago';
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + 'mo ago';
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + 'd ago';
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + 'h ago';
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + 'm ago';
    return 'Just now';
  };

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await BlogService.getPublishedPosts(page, 9);
      setPosts(data.content);
      setTotalPages(data.totalPages);
    } catch (e) {
      setError('Failed to load blog posts.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <Box sx={{ bgcolor: '#0d0d0d', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <PublicNavbar />

      {/* Hero */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #1a0008 0%, #0d0d0d 60%)',
          borderBottom: '1px solid #1f1f1f',
          py: { xs: 6, md: 10 },
          textAlign: 'center',
        }}
      >
        <Container maxWidth="md">
          <Chip label="✦ Ticketer.lk Blog" sx={{ bgcolor: '#ff1955', color: '#fff', mb: 3, fontFamily: 'Raleway, sans-serif', fontWeight: 700 }} />
          <Typography variant="h2" sx={{ color: '#fff', fontFamily: 'Raleway, sans-serif', fontWeight: 900, fontSize: { xs: '2rem', md: '3rem' }, mb: 2 }}>
            News, Stories &amp; Artist Spotlights
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'Raleway, sans-serif', fontSize: '1.1rem' }}>
            Stay up to date with the latest event gossip, artist interviews, and behind-the-scenes coverage.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 6, flexGrow: 1 }}>
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress sx={{ color: '#ff1955' }} />
          </Box>
        ) : posts.length === 0 ? (
          <Typography sx={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', py: 10, fontFamily: 'Raleway, sans-serif', fontSize: '1.1rem' }}>
            No posts yet. Check back soon!
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
            {posts.map((post) => (
              <Card
                key={post.postId}
                onDoubleClick={() => handleLikePost(post.postId)}
                sx={{
                  bgcolor: '#161616',
                  border: '1px solid #222',
                  borderRadius: 3,
                  width: '100%',
                  maxWidth: '550px',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    border: '1px solid #333',
                  },
                }}
              >
                {/* Header: Author Avatar & Name */}
                <Box sx={{ p: 2, pb: 1.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                  {post.authorAvatar ? (
                    <Box component="img" src={post.authorAvatar} alt={post.authorName} sx={{ width: 44, height: 44, borderRadius: '50%' }} />
                  ) : (
                    <Box sx={{ width: 44, height: 44, borderRadius: '50%', bgcolor: '#ff1955', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '1.2rem' }}>
                      {post.authorName ? post.authorName.charAt(0).toUpperCase() : 'T'}
                    </Box>
                  )}
                  <Box>
                    <Typography sx={{ color: '#fff', fontFamily: 'Raleway, sans-serif', fontWeight: 700, fontSize: '0.95rem' }}>
                      {post.authorName || 'Ticketer Admin'}
                    </Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'Raleway, sans-serif', fontSize: '0.75rem' }}>
                      {formatDate(post.createdAt)} •  Public
                    </Typography>
                  </Box>
                </Box>
                
                {/* Post Body (Summary) */}
                <Box sx={{ px: 2, pb: 2 }}>
                  <Typography sx={{ color: '#fff', fontFamily: 'Raleway, sans-serif', fontWeight: 800, fontSize: '1.2rem', mb: 1, lineHeight: 1.3 }}>
                    {post.title}
                  </Typography>
                  {post.summary && expandedPostId !== post.postId && (
                    <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontFamily: 'Raleway, sans-serif', fontSize: '0.95rem', lineHeight: 1.5 }}>
                      {post.summary}{' '}
                      <span
                        onClick={() => handleReadMore(post.postId)}
                        style={{ color: '#ff1955', cursor: 'pointer', fontWeight: 600 }}
                      >
                        Read more
                      </span>
                    </Typography>
                  )}
                  {expandedPostId === post.postId && (
                    <Box sx={{ mt: 2 }}>
                      {expandedLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                          <CircularProgress size={24} sx={{ color: '#ff1955' }} />
                        </Box>
                      ) : (
                        <>
                          <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontFamily: 'Roboto, sans-serif', fontSize: '0.95rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                            {expandedContent}
                          </Typography>
                          <Typography 
                            onClick={() => handleReadMore(post.postId)}
                            sx={{ color: '#ff1955', cursor: 'pointer', fontWeight: 600, mt: 2, fontSize: '0.9rem', display: 'inline-block' }}
                          >
                            Show less
                          </Typography>
                        </>
                      )}
                    </Box>
                  )}
                </Box>

                {/* Media Image */}
                {post.coverImageUrl && (
                  <CardMedia
                    component="img"
                    image={post.coverImageUrl}
                    alt={post.title}
                    sx={{ width: '100%', maxHeight: '350px', objectFit: 'cover', borderTop: '1px solid #1f1f1f', borderBottom: '1px solid #1f1f1f' }}
                  />
                )}

                {/* Engagement Stats */}
                <Box sx={{ px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #222' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ bgcolor: '#ff1955', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FavoriteBorderIcon sx={{ fontSize: 11, color: '#fff' }} />
                    </Box>
                    <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'Raleway, sans-serif', fontSize: '0.85rem' }}>
                        {post.likeCount}
                    </Typography>
                  </Box>
                  <Typography
                    onClick={() => handleOpenComments(post.postId)}
                    sx={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'Raleway, sans-serif', fontSize: '0.85rem', cursor: 'pointer', '&:hover': { color: '#fff' } }}
                  >
                      {post.commentCount} Comments
                  </Typography>
                </Box>

                {/* Footer Action Buttons */}
                <Box sx={{ display: 'flex', px: 1, py: 0.5 }}>
                  <Button 
                    startIcon={<FavoriteBorderIcon />}
                    onClick={() => handleLikePost(post.postId)}
                    sx={{ flex: 1, color: 'rgba(255,255,255,0.6)', py: 1, textTransform: 'none', fontWeight: 600, fontFamily: 'Raleway, sans-serif', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', color: '#ff1955' } }}
                  >
                    Like
                  </Button>
                  <Button 
                    startIcon={<ChatBubbleOutlineIcon />}
                    onClick={() => handleOpenComments(post.postId)}
                    sx={{ flex: 1, color: 'rgba(255,255,255,0.6)', py: 1, textTransform: 'none', fontWeight: 600, fontFamily: 'Raleway, sans-serif', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}
                  >
                    Comment
                  </Button>
                </Box>
              </Card>
            ))}
          </Box>
        )}

        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
            <Pagination
              count={totalPages}
              page={page + 1}
              onChange={(_, v) => setPage(v - 1)}
              sx={{
                '& .MuiPaginationItem-root': { color: 'rgba(255,255,255,0.5)', fontFamily: 'Raleway, sans-serif', border: '1px solid #222' },
                '& .Mui-selected': { bgcolor: '#ff1955 !important', color: '#fff', border: '1px solid #ff1955' },
              }}
            />
          </Box>
        )}
      </Container>

      <Box component="footer" sx={{ bgcolor: 'transparent', color: 'rgba(255,255,255,0.3)', py: 3, textAlign: 'center', fontFamily: 'Raleway, sans-serif', fontSize: '0.85rem' }}>
        © 2026 Ticketer.lk — All Rights Reserved
      </Box>

      {/* Comments Side Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={handleCloseComments}
        PaperProps={{
          sx: { 
            width: { xs: '100%', sm: 420 }, 
            bgcolor: '#0f0f0f', 
            borderLeft: 'none',
            borderRadius: { xs: '12px 12px 0 0', sm: '12px 0 0 12px' },
            boxShadow: '-4px 0 24px rgba(0,0,0,0.8)',
            m: { xs: 0, sm: 1 },
            height: { xs: '100%', sm: 'calc(100% - 16px)' }
          }
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography sx={{ color: '#f1f1f1', fontFamily: 'Roboto, sans-serif', fontWeight: 700, fontSize: '1.2rem' }}>
              Comments <Box component="span" sx={{ color: '#aaa', fontSize: '1rem', fontWeight: 400, ml: 1 }}>{drawerComments.length}</Box>
            </Typography>
            <IconButton onClick={handleCloseComments} sx={{ color: '#f1f1f1' }}>
              <CloseIcon />
            </IconButton>
          </Box>
          
          <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
            {drawerLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                <CircularProgress size={30} sx={{ color: '#ff1955' }} />
              </Box>
            ) : drawerComments.length === 0 ? (
              <Typography sx={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', py: 5, fontFamily: 'Raleway, sans-serif', fontSize: '0.9rem' }}>
                No comments yet.
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, px: 1 }}>
                {drawerComments.map(c => (
                  <CommentItem 
                    key={c.commentId}
                    comment={c}
                    timeAgo={timeAgo}
                    onLike={handleToggleCommentLike}
                    onReplyClick={(id: string) => {
                      if (!isAuthenticated()) {
                        alert('Please log in to reply.');
                        return;
                      }
                      setReplyingToId(id);
                      setReplyText('');
                    }}
                    replyingToId={replyingToId}
                    replyText={replyText}
                    setReplyText={setReplyText}
                    onSubmitReply={handleAddComment}
                    submittingReply={submittingReply}
                    onCancelReply={() => {
                      setReplyingToId(null);
                      setReplyText('');
                    }}
                    currentUserId={user?.id}
                    isAuthenticated={isAuthenticated()}
                  />
                ))}
              </Box>
            )}
          </Box>

          <Box sx={{ p: 2, pt: 1 }}>
            {isAuthenticated() ? (
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                <Avatar sx={{ bgcolor: '#ff1955', width: 40, height: 40, fontSize: '1rem' }}>
                  {user?.email?.[0]?.toUpperCase() || 'U'}
                </Avatar>
                <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <TextField
                    fullWidth
                    variant="standard"
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    sx={{
                      '& .MuiInput-root': {
                        color: '#f1f1f1', fontSize: '0.95rem', fontFamily: 'Roboto, sans-serif',
                        '&:before': { borderBottom: '1px solid #3f3f3f' },
                        '&:hover:not(.Mui-disabled):before': { borderBottom: '1px solid #717171' },
                        '&:after': { borderBottom: '1px solid #f1f1f1' },
                      },
                    }}
                  />
                  {commentText.trim() && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                      <Button 
                        onClick={() => setCommentText('')}
                        sx={{ color: '#f1f1f1', borderRadius: 5, textTransform: 'none', px: 2, '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={() => handleAddComment()}
                        disabled={submittingComment}
                        sx={{ color: '#1a1a1a', bgcolor: '#3ea6ff', borderRadius: 5, textTransform: 'none', px: 2, ml: 1, '&:hover': { bgcolor: '#65b8ff' }, '&:disabled': { bgcolor: '#272727', color: '#717171' } }}
                      >
                        {submittingComment ? <CircularProgress size={20} sx={{ color: '#717171' }} /> : 'Comment'}
                      </Button>
                    </Box>
                  )}
                </Box>
              </Box>
            ) : (
              <Typography sx={{ color: '#aaaaaa', fontFamily: 'Roboto, sans-serif', fontSize: '0.85rem', textAlign: 'center' }}>
                Log in to add a comment
              </Typography>
            )}
          </Box>
        </Box>
      </Drawer>

      <PublicFooter />
    </Box>
  );
};

export default Blog;
