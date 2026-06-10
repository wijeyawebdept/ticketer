import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Container, Typography, Grid, Card, CardMedia, CardContent,
  Chip, Button, CircularProgress, Alert, Pagination,
} from '@mui/material';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import { useNavigate } from 'react-router-dom';
import PublicNavbar from '../../../components/public/PublicNavbar';
import BlogService, { BlogPostSummary } from '../../../services/BlogService';

const Blog: React.FC = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPostSummary[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          <Grid container spacing={3}>
            {posts.map((post) => (
              <Grid item xs={12} sm={6} md={4} key={post.postId}>
                <Card
                  onClick={() => navigate(`/blog/${post.postId}`)}
                  sx={{
                    bgcolor: '#161616',
                    border: '1px solid #222',
                    borderRadius: 3,
                    cursor: 'pointer',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      border: '1px solid #ff1955',
                      transform: 'translateY(-4px)',
                      boxShadow: '0 16px 48px rgba(255,25,85,0.15)',
                    },
                  }}
                >
                  {post.coverImageUrl ? (
                    <CardMedia
                      component="img"
                      height="200"
                      image={post.coverImageUrl}
                      alt={post.title}
                      sx={{ objectFit: 'cover', borderRadius: '12px 12px 0 0' }}
                    />
                  ) : (
                    <Box sx={{
                      height: 200, bgcolor: '#1f1f1f', borderRadius: '12px 12px 0 0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Typography sx={{ color: '#333', fontSize: '3rem' }}></Typography>
                    </Box>
                  )}
                  <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <Typography sx={{ color: '#fff', fontFamily: 'Raleway, sans-serif', fontWeight: 800, fontSize: '1rem', mb: 1, lineHeight: 1.4, flexGrow: 1 }}>
                      {post.title}
                    </Typography>
                    {post.summary && (
                      <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'Raleway, sans-serif', fontSize: '0.83rem', mb: 2, lineHeight: 1.5,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {post.summary}
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'Raleway, sans-serif', fontSize: '0.75rem' }}>
                        {formatDate(post.createdAt)}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'rgba(255,255,255,0.4)' }}>
                          <FavoriteBorderIcon sx={{ fontSize: 14 }} />
                          <Typography sx={{ fontFamily: 'Raleway, sans-serif', fontSize: '0.78rem' }}>{post.likeCount}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'rgba(255,255,255,0.4)' }}>
                          <ChatBubbleOutlineIcon sx={{ fontSize: 14 }} />
                          <Typography sx={{ fontFamily: 'Raleway, sans-serif', fontSize: '0.78rem' }}>{post.commentCount}</Typography>
                        </Box>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
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
    </Box>
  );
};

export default Blog;
