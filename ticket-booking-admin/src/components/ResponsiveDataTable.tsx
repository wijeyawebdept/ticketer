import React, { useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Card,
  CardContent,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  IconButton,
  Tooltip,
  Skeleton,
  Chip,
  useTheme,
  useMediaQuery,
  Stack
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ChevronLeft,
  ChevronRight,
  Refresh as RefreshIcon,
  InboxOutlined as EmptyIcon,
  ErrorOutline as ErrorIcon
} from '@mui/icons-material';

export interface ColumnDef<T> {
  id: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  minWidth?: number | string;
  isPrimaryField?: boolean; // Included in top 4-5 fields on mobile card view
  render?: (row: T) => React.ReactNode;
}

export interface ResponsiveDataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  keyExtractor: (row: T) => string | number;
  loading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  page?: number;
  rowsPerPage?: number;
  totalCount?: number;
  onPageChange?: (event: unknown, newPage: number) => void;
  onRowsPerPageChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  actionsRenderer?: (row: T) => React.ReactNode;
}

export function ResponsiveDataTable<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  isError = false,
  errorMessage = 'Failed to load data. Please try again.',
  onRetry,
  emptyTitle = 'No data found',
  emptyMessage = 'There are no records to display at this time.',
  emptyActionLabel,
  onEmptyAction,
  page = 0,
  rowsPerPage = 10,
  totalCount,
  onPageChange,
  onRowsPerPageChange,
  actionsRenderer,
}: ResponsiveDataTableProps<T>) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [expandedRow, setExpandedRow] = useState<string | number | false>(false);

  const handleAccordionChange = (rowKey: string | number) => (
    _: React.SyntheticEvent,
    isExpanded: boolean
  ) => {
    setExpandedRow(isExpanded ? rowKey : false);
  };

  // Primary fields for mobile card header (max 4-5)
  const primaryColumns = columns.filter((col) => col.isPrimaryField);
  const effectivePrimaryCols = primaryColumns.length > 0 ? primaryColumns : columns.slice(0, 4);
  const secondaryColumns = columns.filter((col) => !effectivePrimaryCols.includes(col));

  // 1. Error State
  if (isError) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, sm: 5 },
          textAlign: 'center',
          borderRadius: 3,
          backgroundColor: '#fff',
          border: '1px solid rgba(229, 115, 115, 0.3)',
        }}
      >
        <ErrorIcon sx={{ fontSize: 56, color: '#e53935', mb: 1.5 }} />
        <Typography variant="h6" fontWeight={700} color="#1e293b" gutterBottom>
          Unable to Load Records
        </Typography>
        <Typography variant="body2" color="#64748b" sx={{ mb: 3, maxWidth: 450, mx: 'auto' }}>
          {errorMessage}
        </Typography>
        {onRetry && (
          <Button
            variant="contained"
            onClick={onRetry}
            startIcon={<RefreshIcon />}
            sx={{
              backgroundColor: '#ff1955',
              fontWeight: 700,
              minHeight: 44,
              px: 3,
              borderRadius: 2,
              '&:hover': { backgroundColor: '#d01443' },
            }}
          >
            Retry Loading
          </Button>
        )}
      </Paper>
    );
  }

  // 2. Loading State (Skeletons)
  if (loading) {
    if (isMobile) {
      return (
        <Stack spacing={2}>
          {[1, 2, 3, 4].map((idx) => (
            <Card key={idx} sx={{ borderRadius: 3, p: 2 }}>
              <Skeleton variant="text" width="60%" height={28} sx={{ mb: 1 }} />
              <Skeleton variant="text" width="40%" height={20} sx={{ mb: 1 }} />
              <Skeleton variant="rectangular" width="100%" height={40} sx={{ borderRadius: 2 }} />
            </Card>
          ))}
        </Stack>
      );
    }

    return (
      <TableContainer component={Paper} sx={{ borderRadius: 3, overflowX: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f8fafc' }}>
              {columns.map((col) => (
                <TableCell key={col.id}>
                  <Skeleton variant="text" width="80%" />
                </TableCell>
              ))}
              {actionsRenderer && <TableCell align="right"><Skeleton variant="text" width="50%" /></TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {[1, 2, 3, 4, 5].map((rowIdx) => (
              <TableRow key={rowIdx}>
                {columns.map((col) => (
                  <TableCell key={col.id}>
                    <Skeleton variant="text" width="90%" />
                  </TableCell>
                ))}
                {actionsRenderer && <TableCell align="right"><Skeleton variant="text" width={60} sx={{ ml: 'auto' }} /></TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  // 3. Empty State
  if (!data || data.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: { xs: 4, sm: 6 },
          textAlign: 'center',
          borderRadius: 3,
          backgroundColor: '#fff',
          border: '1px border-dashed #cbd5e1',
        }}
      >
        <EmptyIcon sx={{ fontSize: 60, color: '#94a3b8', mb: 1.5 }} />
        <Typography variant="h6" fontWeight={700} color="#1e293b" gutterBottom>
          {emptyTitle}
        </Typography>
        <Typography variant="body2" color="#64748b" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
          {emptyMessage}
        </Typography>
        {emptyActionLabel && onEmptyAction && (
          <Button
            variant="contained"
            onClick={onEmptyAction}
            sx={{
              backgroundColor: '#ff1955',
              fontWeight: 700,
              minHeight: 44,
              px: 3,
              borderRadius: 2,
              '&:hover': { backgroundColor: '#d01443' },
            }}
          >
            {emptyActionLabel}
          </Button>
        )}
      </Paper>
    );
  }

  // 4. Mobile Card View (<600px)
  if (isMobile) {
    const totalPages = totalCount !== undefined ? Math.ceil(totalCount / rowsPerPage) : Math.ceil(data.length / rowsPerPage);

    return (
      <Box>
        <Stack spacing={2} sx={{ mb: 2 }}>
          {data.map((row) => {
            const key = keyExtractor(row);
            const isExpanded = expandedRow === key;

            return (
              <Card
                key={key}
                elevation={1}
                sx={{
                  borderRadius: 3,
                  border: '1px solid #e2e8f0',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease',
                }}
              >
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  {/* Primary Fields Grid */}
                  <Stack spacing={1.2}>
                    {effectivePrimaryCols.map((col, idx) => {
                      const val = col.render ? col.render(row) : (row as any)[col.id];
                      const isTitle = idx === 0;

                      return (
                        <Box key={col.id} sx={{ display: 'flex', justifyContent: isTitle ? 'flex-start' : 'space-between', alignItems: 'center' }}>
                          {!isTitle && (
                            <Typography variant="caption" color="text.secondary" fontWeight={600}>
                              {col.label}:
                            </Typography>
                          )}
                          <Typography
                            variant={isTitle ? 'subtitle1' : 'body2'}
                            fontWeight={isTitle ? 800 : 500}
                            color={isTitle ? '#0f172a' : '#334155'}
                            sx={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: isTitle ? '100%' : '65%',
                            }}
                          >
                            {val ?? 'N/A'}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Stack>

                  {/* Actions & Expandable Detail Accordion */}
                  <Box
                    sx={{
                      mt: 1.5,
                      pt: 1.5,
                      borderTop: '1px solid #f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 1,
                    }}
                  >
                    {actionsRenderer && <Box sx={{ flex: 1 }}>{actionsRenderer(row)}</Box>}

                    {secondaryColumns.length > 0 && (
                      <Accordion
                        expanded={isExpanded}
                        onChange={handleAccordionChange(key)}
                        elevation={0}
                        sx={{
                          width: '100%',
                          '&:before': { display: 'none' },
                          backgroundColor: 'transparent',
                          m: '0 !important',
                        }}
                      >
                        <AccordionSummary
                          expandIcon={<ExpandMoreIcon sx={{ color: '#ff1955' }} />}
                          sx={{
                            p: 0,
                            minHeight: 36,
                            '& .MuiAccordionSummary-content': { my: 0.5 },
                          }}
                        >
                          <Typography variant="caption" fontWeight={700} color="#ff1955">
                            {isExpanded ? 'Hide Details' : 'View Full Details'}
                          </Typography>
                        </AccordionSummary>

                        {/* Lazy Render Accordion Content */}
                        <AccordionDetails sx={{ p: 1.5, backgroundColor: '#f8fafc', borderRadius: 2, mt: 1 }}>
                          <Stack spacing={1}>
                            {secondaryColumns.map((col) => {
                              const val = col.render ? col.render(row) : (row as any)[col.id];
                              return (
                                <Box key={col.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                    {col.label}:
                                  </Typography>
                                  <Typography variant="body2" color="#334155" fontWeight={500} sx={{ textAlign: 'right' }}>
                                    {val ?? 'N/A'}
                                  </Typography>
                                </Box>
                              );
                            })}
                          </Stack>
                        </AccordionDetails>
                      </Accordion>
                    )}
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Stack>

        {/* Mobile Compact Pagination Controls */}
        {onPageChange && (
          <Paper
            elevation={0}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 1.5,
              borderRadius: 3,
              border: '1px solid #e2e8f0',
              backgroundColor: '#fff',
            }}
          >
            <IconButton
              disabled={page === 0}
              onClick={(e) => onPageChange(e, page - 1)}
              sx={{ minHeight: 44, minWidth: 44, color: '#334155' }}
              aria-label="Previous Page"
            >
              <ChevronLeft />
            </IconButton>

            <Typography variant="caption" fontWeight={700} color="#475569">
              Page {page + 1} of {totalPages || 1}
            </Typography>

            <IconButton
              disabled={page + 1 >= totalPages}
              onClick={(e) => onPageChange(e, page + 1)}
              sx={{ minHeight: 44, minWidth: 44, color: '#334155' }}
              aria-label="Next Page"
            >
              <ChevronRight />
            </IconButton>
          </Paper>
        )}
      </Box>
    );
  }

  // 5. Tablet & Desktop View (Scrollable Table)
  return (
    <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      <TableContainer sx={{ overflowX: 'auto', maxWidth: '100%' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f8fafc' }}>
              {columns.map((col) => (
                <TableCell
                  key={col.id}
                  align={col.align || 'left'}
                  sx={{
                    fontWeight: 700,
                    color: '#475569',
                    fontSize: '13px',
                    minWidth: col.minWidth || 'auto',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {col.label}
                </TableCell>
              ))}
              {actionsRenderer && (
                <TableCell align="right" sx={{ fontWeight: 700, color: '#475569', fontSize: '13px', whiteSpace: 'nowrap' }}>
                  Actions
                </TableCell>
              )}
            </TableRow>
          </TableHead>

          <TableBody>
            {data.map((row) => {
              const key = keyExtractor(row);
              return (
                <TableRow key={key} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  {columns.map((col) => {
                    const val = col.render ? col.render(row) : (row as any)[col.id];
                    return (
                      <TableCell key={col.id} align={col.align || 'left'} sx={{ fontSize: '14px', color: '#1e293b' }}>
                        {val ?? 'N/A'}
                      </TableCell>
                    );
                  })}
                  {actionsRenderer && <TableCell align="right">{actionsRenderer(row)}</TableCell>}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {onPageChange && (
        <TablePagination
          component="div"
          count={totalCount !== undefined ? totalCount : data.length}
          page={page}
          onPageChange={onPageChange}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={onRowsPerPageChange}
          rowsPerPageOptions={[5, 10, 25, 50]}
          sx={{ borderTop: '1px solid #e2e8f0' }}
        />
      )}
    </Paper>
  );
}

export default ResponsiveDataTable;
