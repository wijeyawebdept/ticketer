import React, { useState, useEffect } from 'react';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, IconButton, TextField, Typography, Alert, Chip, CircularProgress,
  Tooltip, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PublicIcon from '@mui/icons-material/Public';
import PublicOffIcon from '@mui/icons-material/PublicOff';
import SendIcon from '@mui/icons-material/Send';
import EditIcon from '@mui/icons-material/Edit';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import { useNavigate } from 'react-router-dom';
import BlogService, { BlogPostSummary, BlogImage } from '../../services/BlogService';

const AdminCommentItem = ({
  comment,
  formatDate,
  onDelete,
  onReplyClick,
  replyingToId,
  replyText,
  setReplyText,
  onSubmitReply,
  submittingReply,
  onCancelReply,
  onLike,
}: any) => {
  return (
    <Box sx={{ mb: 2, p: 1.5, bgcolor: '#fff', borderRadius: 1, border: '1px solid #eee' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{comment.userName}</Typography>
          {comment.isAdmin && <Chip label="Admin" size="small" sx={{ height: 16, fontSize: '0.6rem', bgcolor: '#ff1955', color: '#fff', fontWeight: 'bold' }} />}
        </Box>
        <Typography variant="caption" color="text.secondary">{formatDate(comment.createdAt)}</Typography>
      </Box>
      <Typography variant="body2" sx={{ color: '#444', mb: 1 }}>{comment.content}</Typography>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer' }} onClick={() => onLike(comment.commentId)}>
            {comment.likedByCurrentUser ? (
              <FavoriteIcon sx={{ fontSize: 16, color: '#ff1955' }} />
            ) : (
              <FavoriteBorderIcon sx={{ fontSize: 16, color: '#777' }} />
            )}
            <Typography variant="caption" sx={{ color: '#777' }}>{comment.likeCount}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer' }} onClick={() => onReplyClick(comment.commentId)}>
            <ChatBubbleOutlineIcon sx={{ fontSize: 16, color: '#777' }} />
            <Typography variant="caption" sx={{ color: '#777' }}>Reply</Typography>
          </Box>
        </Box>
        <Button size="small" color="error" startIcon={<DeleteIcon sx={{ fontSize: '14px !important' }} />}
                onClick={() => onDelete(comment.commentId)} sx={{ fontSize: '0.7rem', py: 0 }}>
          Delete
        </Button>
      </Box>

      {replyingToId === comment.commentId && (
        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column' }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Add a reply..."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
            <Button onClick={onCancelReply} size="small">Cancel</Button>
            <Button onClick={() => onSubmitReply(comment.commentId)} disabled={submittingReply || !replyText.trim()} size="small" variant="contained" sx={{ ml: 1, bgcolor: '#ff1955' }}>
              {submittingReply ? <CircularProgress size={16} /> : 'Reply'}
            </Button>
          </Box>
        </Box>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <Box sx={{ mt: 2, pl: 2, borderLeft: '2px solid #eee' }}>
          {comment.replies.map((reply: any) => (
            <AdminCommentItem
              key={reply.commentId}
              comment={reply}
              formatDate={formatDate}
              onDelete={onDelete}
              onReplyClick={onReplyClick}
              replyingToId={replyingToId}
              replyText={replyText}
              setReplyText={setReplyText}
              onSubmitReply={onSubmitReply}
              submittingReply={submittingReply}
              onCancelReply={onCancelReply}
              onLike={onLike}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};


const BlogManagement: React.FC = () => {
  // const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPostSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [digestDialogOpen, setDigestDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<BlogImage[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);

  // Digest state
  const [digestSubject, setDigestSubject] = useState('');
  const [digestMessage, setDigestMessage] = useState('');
  const [sendingDigest, setSendingDigest] = useState(false);

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const data = await BlogService.getAllPostsAdmin();
      setPosts(data.content);
    } catch {
      setError('Failed to load blog posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPosts(); }, []);

  const handleOpenDialog = () => {
    setOpenDialog(true);
    setEditMode(false);
    setEditingPostId(null);
    setTitle(''); setSummary(''); setContent('');
    setSelectedFiles([]); setPreviewUrls([]);
    setExistingImages([]);
  };

  const handleEdit = async (post: BlogPostSummary) => {
    setLoading(true);
    try {
      const detail = await BlogService.getPostAdmin(post.postId);
      setEditingPostId(post.postId);
      setEditMode(true);
      setTitle(detail.title);
      setSummary(detail.summary || '');
      setContent(detail.content || '');
      setExistingImages(detail.images);
      setSelectedFiles([]);
      setPreviewUrls([]);
      setOpenDialog(true);
    } catch {
      setError('Failed to load post for editing');
    } finally {
      setLoading(false);
    }
  };

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const valid = files.filter((f) => f.size <= 5 * 1024 * 1024);
      if (valid.length < files.length) setError('Some files exceeded 5MB limit and were skipped.');
      setSelectedFiles((prev) => [...prev, ...valid]);
      setPreviewUrls((prev) => [...prev, ...valid.map((f) => URL.createObjectURL(f))]);
    }
  };

  const removeImage = (idx: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!title.trim()) { setError('Title is required'); return; }
    setLoading(true);
    try {
      const form = new FormData();
      form.append('title', title);
      if (summary) form.append('summary', summary);
      if (content) form.append('content', content);
      selectedFiles.forEach((f) => form.append('images', f));
      
      if (editMode && editingPostId) {
        await BlogService.updatePost(editingPostId, form);
        setSuccess('Blog post updated successfully!');
      } else {
        await BlogService.createPost(form);
        setSuccess('Blog post created successfully!');
      }
      
      setOpenDialog(false);
      fetchPosts();
    } catch {
      setError(editMode ? 'Failed to update post' : 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExistingImage = async (imageId: string) => {
    if (!window.confirm('Remove this image?')) return;
    try {
      await BlogService.deleteImage(imageId);
      setExistingImages((prev) => prev.filter((img) => img.imageId !== imageId));
      setSuccess('Image removed');
      // If we are also viewing details, refresh them
      if (selectedPost) handleViewDetails(selectedPost.postId);
    } catch {
      setError('Failed to remove image');
    }
  };

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow drop
  };

  const handleDrop = async (index: number) => {
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newImages = [...existingImages];
    const draggedItem = newImages[draggedIndex];
    newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedItem);
    
    setExistingImages(newImages);
    setDraggedIndex(null);
    
    try {
      await BlogService.updateImageOrder(newImages.map(img => img.imageId));
      setSuccess('Image order updated');
    } catch {
      setError('Failed to update image order');
      // Revert if failed? Or just keep local
      fetchPosts(); 
    }
  };

  const handleTogglePublish = async (postId: string, currentlyPublished: boolean) => {
    try {
      await BlogService.togglePublish(postId);
      setSuccess(`Post ${currentlyPublished ? 'unpublished' : 'published'} successfully`);
      fetchPosts();
    } catch {
      setError('Failed to toggle publish status');
    }
  };

  const handleDelete = (postId: string) => {
    setPostToDelete(postId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!postToDelete) return;
    setDeleteDialogOpen(false);
    try {
      await BlogService.deletePost(postToDelete);
      setSuccess('Post moved to recycle bin');
      fetchPosts();
    } catch {
      setError('Failed to delete post');
    } finally {
      setPostToDelete(null);
    }
  };

  const handleViewDetails = async (postId: string) => {
    setDetailsLoading(true);
    setDetailsDialogOpen(true);
    try {
      const data = await BlogService.getPostAdmin(postId);
      setSelectedPost(data);
    } catch {
      setError('Failed to load post details');
      setDetailsDialogOpen(false);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await BlogService.deleteComment(commentId);
      setSuccess('Comment deleted');
      // Refresh details
      if (selectedPost) {
        handleViewDetails(selectedPost.postId);
        fetchPosts(); // Also update comment count in main list
      }
    } catch {
      setError('Failed to delete comment');
    }
  };

  const handleToggleLike = async (commentId: string) => {
    try {
      await BlogService.toggleCommentLike(commentId);
      if (selectedPost) handleViewDetails(selectedPost.postId);
    } catch {
      setError('Failed to toggle like');
    }
  };

  const handleReplyClick = (commentId: string) => {
    setReplyingToId(commentId);
    setReplyText('');
  };

  const handleCancelReply = () => {
    setReplyingToId(null);
    setReplyText('');
  };

  const handleSubmitReply = async (parentCommentId: string) => {
    if (!replyText.trim() || !selectedPost) return;
    setSubmittingReply(true);
    try {
      await BlogService.addComment(selectedPost.postId, replyText.trim(), parentCommentId);
      setReplyingToId(null);
      setReplyText('');
      handleViewDetails(selectedPost.postId); // Refresh
    } catch {
      setError('Failed to submit reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !selectedPost) return;
    setSubmittingComment(true);
    try {
      await BlogService.addComment(selectedPost.postId, commentText.trim());
      setCommentText('');
      handleViewDetails(selectedPost.postId); // Refresh
      fetchPosts();
    } catch {
      setError('Failed to submit comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleSendDigest = async () => {
    setSendingDigest(true);
    try {
      await BlogService.sendDigest(digestSubject || undefined, digestMessage || undefined);
      setSuccess('Blog digest email sent to all subscribers!');
      setDigestDialogOpen(false);
    } catch {
      setError('Failed to send digest');
    } finally {
      setSendingDigest(false);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <h1>Blog Management</h1>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<SendIcon />} onClick={() => setDigestDialogOpen(true)}
            sx={{ borderColor: '#ff1955', color: '#ff1955', '&:hover': { bgcolor: 'rgba(255,25,85,0.08)' } }}>
            Send Digest Email
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenDialog}
            sx={{ bgcolor: '#ff1955', '&:hover': { bgcolor: '#e01545' } }}>
            New Post
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

      {loading && <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>}

      {!loading && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                <TableCell>Cover</TableCell>
                <TableCell>Title</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="center">Likes</TableCell>
                <TableCell align="center">Comments</TableCell>
                <TableCell>Date</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {posts.length === 0 ? (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 3 }}>No blog posts yet. Create your first post!</TableCell></TableRow>
              ) : (
                posts.map((post) => (
                  <TableRow key={post.postId} hover>
                    <TableCell>
                      {post.coverImageUrl ? (
                        <Box component="img" src={post.coverImageUrl} sx={{ width: 72, height: 52, objectFit: 'cover', borderRadius: 1 }} />
                      ) : (
                        <Box sx={{ width: 72, height: 52, bgcolor: '#eee', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa' }}></Box>
                      )}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, maxWidth: 220 }}>
                      <Typography noWrap>{post.title}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={post.published ? 'Published' : 'Draft'}
                        color={post.published ? 'success' : 'default'} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell align="center">{post.likeCount}</TableCell>
                    <TableCell align="center">{post.commentCount}</TableCell>
                    <TableCell>{formatDate(post.createdAt)}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="View Details & Comments">
                        <IconButton size="small" color="primary" onClick={() => handleViewDetails(post.postId)}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="View on public site">
                        <IconButton size="small" color="info" onClick={() => window.open(`/blog/${post.postId}`, '_blank')}>
                          <PublicIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={post.published ? 'Unpublish' : 'Publish'}>
                        <IconButton size="small" color={post.published ? 'warning' : 'success'}
                          onClick={() => handleTogglePublish(post.postId, post.published)}>
                          {post.published ? <PublicOffIcon fontSize="small" /> : <PublicIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Move to Recycle Bin">
                        <IconButton size="small" color="warning"
                          sx={{ backgroundColor: 'rgba(255,152,0,0.1)', '&:hover': { backgroundColor: 'rgba(255,152,0,0.2)' } }}
                          onClick={() => handleDelete(post.postId)}>
                          <DeleteSweepIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton size="small" color="secondary" onClick={() => handleEdit(post)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create/Edit Post Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editMode ? 'Edit Blog Post' : 'Create New Blog Post'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={3} sx={{ mt: 0 }}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Title *" value={title} onChange={(e) => setTitle(e.target.value)} margin="normal" />
              <TextField fullWidth label="Summary (teaser text)" value={summary} onChange={(e) => setSummary(e.target.value)} margin="normal" multiline rows={2} />
              <TextField fullWidth label="Full Content" value={content} onChange={(e) => setContent(e.target.value)} margin="normal" multiline rows={6} placeholder="Write the full article content here..." />
            </Grid>
            <Grid item xs={12} md={6}>
              {existingImages.length > 0 && (
                <>
                  <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Existing Images (drag to reorder, click × to remove)</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    {existingImages.map((img, index) => (
                      <Box 
                        key={img.imageId} 
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(index)}
                        sx={{ 
                          position: 'relative', width: 100, height: 75, cursor: 'grab',
                          '&:active': { cursor: 'grabbing' },
                          opacity: draggedIndex === index ? 0.5 : 1,
                          border: '2px solid transparent',
                          transition: 'all 0.2s',
                          '&:hover': { borderColor: '#ff1955' }
                        }}
                      >
                        <Box component="img" src={img.imageUrl} sx={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 1 }} />
                        <IconButton size="small" onClick={() => handleDeleteExistingImage(img.imageId)}
                          sx={{ position: 'absolute', top: -6, right: -6, bgcolor: '#ff1955', color: '#fff', width: 20, height: 20, p: 0, '&:hover': { bgcolor: '#c0003a' } }}>
                          ×
                        </IconButton>
                      </Box>
                    ))}
                  </Box>
                  <Divider sx={{ my: 2 }} />
                </>
              )}
              
              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>{editMode ? 'Add New Images' : 'Images'} (multiple allowed, max 5MB each)</Typography>
              <Button variant="outlined" component="label" sx={{ mb: 2 }}>
                Add Images
                <input type="file" multiple hidden accept="image/*" onChange={handleFilesChange} />
              </Button>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {previewUrls.map((url, i) => (
                  <Box key={i} sx={{ position: 'relative', width: 100, height: 75 }}>
                    <Box component="img" src={url} sx={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 1 }} />
                    <IconButton size="small" onClick={() => removeImage(i)}
                      sx={{ position: 'absolute', top: -6, right: -6, bgcolor: '#ff1955', color: '#fff', width: 20, height: 20, p: 0, '&:hover': { bgcolor: '#c0003a' } }}>
                      ×
                    </IconButton>
                  </Box>
                ))}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={loading || !title.trim()}
            sx={{ bgcolor: '#ff1955', '&:hover': { bgcolor: '#e01545' } }}>
            {loading ? (editMode ? 'Updating...' : 'Creating...') : (editMode ? 'Update Post' : 'Create Post')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Digest Dialog */}
      <Dialog open={digestDialogOpen} onClose={() => setDigestDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Send Blog Digest Email</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            This will send a digest of all newly published posts to users who have opted in to email notifications.
          </Alert>
          <TextField fullWidth label="Email Subject (optional)" value={digestSubject}
            onChange={(e) => setDigestSubject(e.target.value)} margin="normal"
            placeholder="📰 Ticketer.lk — Latest Blog Updates" />
          <TextField fullWidth label="Custom Message (optional)" value={digestMessage}
            onChange={(e) => setDigestMessage(e.target.value)} margin="normal"
            multiline rows={3} placeholder="Add a personal note at the top of the digest email..." />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDigestDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSendDigest} variant="contained" disabled={sendingDigest}
            startIcon={sendingDigest ? <CircularProgress size={16} /> : <SendIcon />}
            sx={{ bgcolor: '#ff1955', '&:hover': { bgcolor: '#e01545' } }}>
            {sendingDigest ? 'Sending...' : 'Send Digest'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Details & Comments Dialog */}
      <Dialog open={detailsDialogOpen} onClose={() => setDetailsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">{selectedPost?.title || 'Post Details'}</Typography>
          {selectedPost && (
            <Chip label={selectedPost.published ? 'Published' : 'Draft'} 
                  color={selectedPost.published ? 'success' : 'default'} size="small" />
          )}
        </DialogTitle>
        <DialogContent dividers>
          {detailsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : selectedPost ? (
            <Grid container spacing={3}>
              <Grid item xs={12} md={7}>
                <Typography variant="subtitle2" color="text.secondary">Summary</Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>{selectedPost.summary || 'No summary provided.'}</Typography>
                
                <Typography variant="subtitle2" color="text.secondary">Content</Typography>
                <Box sx={{ 
                  bgcolor: '#f9f9f9', p: 2, borderRadius: 1, border: '1px solid #eee',
                  maxHeight: '300px', overflowY: 'auto', whiteSpace: 'pre-wrap', fontSize: '0.9rem'
                }}>
                  {selectedPost.content || 'No content provided.'}
                </Box>
                
                <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>Images</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {selectedPost.images.map((img: any, i: number) => (
                    <Box key={i} component="img" src={img.imageUrl} 
                         sx={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 1, border: '1px solid #ddd' }} />
                  ))}
                  {selectedPost.images.length === 0 && <Typography variant="caption">No images.</Typography>}
                </Box>
              </Grid>
              
              <Grid item xs={12} md={5}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>
                    Comments ({selectedPost.comments.length})
                  </Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ maxHeight: '450px', overflowY: 'auto' }}>
                  {selectedPost.comments.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                      No comments yet.
                    </Typography>
                  ) : (
                    selectedPost.comments.map((comment: any) => (
                      <AdminCommentItem
                        key={comment.commentId}
                        comment={comment}
                        formatDate={formatDate}
                        onDelete={handleDeleteComment}
                        onReplyClick={handleReplyClick}
                        replyingToId={replyingToId}
                        replyText={replyText}
                        setReplyText={setReplyText}
                        onSubmitReply={handleSubmitReply}
                        submittingReply={submittingReply}
                        onCancelReply={handleCancelReply}
                        onLike={handleToggleLike}
                      />
                    ))
                  )}

                  <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Add a Comment as Admin</Typography>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Write your comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      multiline rows={2}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                      <Button onClick={handleSubmitComment} disabled={submittingComment || !commentText.trim()} variant="contained" sx={{ bgcolor: '#ff1955' }}>
                        {submittingComment ? <CircularProgress size={16} /> : 'Post Comment'}
                      </Button>
                    </Box>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Move Blog Post to Recycle Bin</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to move this blog post to the recycle bin? You can restore it later from the Recycle Bin section.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} sx={{ fontWeight: 500 }}>Cancel</Button>
          <Button onClick={handleConfirmDelete} variant="contained" color="warning" sx={{ fontWeight: 500 }}>
            Move to Recycle Bin
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BlogManagement;
