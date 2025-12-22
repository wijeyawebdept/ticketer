import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Button,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Select,
  MenuItem,
  SelectChangeEvent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PublicNavbar from '../../../components/public/PublicNavbar';

interface TicketCategory {
  name: string;
  price: number;
  quantity: number;
}

const EventDetails: React.FC = () => {
  const [selectedShowtime, setSelectedShowtime] = useState('1');
  const [ticketQuantities, setTicketQuantities] = useState<{ [key: string]: number }>({
    'Ground Floor Reserved Seating': 0,
    'Balcony Reserved Seating': 0,
    'Standing Tickets': 0,
  });
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('visa');
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    email: '',
    nic: '',
  });

  const ticketCategories: TicketCategory[] = [
    { name: 'Ground Floor Reserved Seating', price: 5000, quantity: 0 },
    { name: 'Balcony Reserved Seating', price: 3000, quantity: 0 },
    { name: 'Standing Tickets', price: 1000, quantity: 0 },
  ];

  const handleShowtimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedShowtime(event.target.value);
  };

  const handleQuantityChange = (categoryName: string, value: string) => {
    setTicketQuantities({
      ...ticketQuantities,
      [categoryName]: parseInt(value) || 0,
    });
  };

  const handleNextClick = () => {
    setPaymentModalOpen(true);
  };

  const handleCloseModal = () => {
    setPaymentModalOpen(false);
  };

  const calculateTotal = () => {
    let total = 0;
    ticketCategories.forEach((category) => {
      total += category.price * (ticketQuantities[category.name] || 0);
    });
    return total;
  };

  const handlePaymentMethodChange = (
    event: React.MouseEvent<HTMLElement>,
    newMethod: string | null
  ) => {
    if (newMethod !== null) {
      setSelectedPaymentMethod(newMethod);
    }
  };

  const handleCustomerInfoChange = (field: string, value: string) => {
    setCustomerInfo({
      ...customerInfo,
      [field]: value,
    });
  };

  return (
    <Box
      sx={{
        backgroundImage: 'url(/images/mt-0390-tickets-bg.jpg)',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'top center',
        backgroundSize: 'cover',
        minHeight: '100vh',
        width: '100%',
      }}
    >
      <PublicNavbar />

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Grid container spacing={0} sx={{ mt: 4, display: 'flex', alignItems: 'stretch' }}>
          {/* Left Column - Event Information */}
          <Grid item xs={12} md={6} sx={{ display: 'flex', paddingRight: { md: '15px' } }}>
            <Box
              className="inner-side"
              sx={{
                marginTop: '70px',
                backgroundColor: 'rgba(47,55,66,0.9)',
                borderRadius: '13px',
                paddingTop: '20px',
                paddingBottom: '30px',
                paddingLeft: '30px',
                paddingRight: '30px',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Typography
                component="h1"
                className="my-4 inner-text"
                sx={{
                  marginTop: '1.5rem',
                  marginBottom: '1.5rem',
                  fontWeight: 300,
                  fontFamily: 'Raleway, sans-serif',
                  color: '#ffffff',
                  fontSize: '30px',
                  lineHeight: 1.2,
                }}
              >
                Events Information
              </Typography>
              <Typography
                component="p"
                sx={{
                  marginTop: 0,
                  marginBottom: '1rem',
                  color: '#fff',
                  fontFamily: 'Raleway, sans-serif',
                }}
              >
                Lorem ipsum dolor sit amet, quo possit insolens no, nam te prima
                explicari, ex vel ancillae conclusionemque. Vel discere fastidii ex.
                Mea homero aeterno id. At quas facete sadipscing pro. Eam primis
                iuvaret ei, at vim lucilius recteque, eius nominavi definiebas eu est.
              </Typography>
              <Typography
                component="p"
                sx={{
                  marginTop: 0,
                  marginBottom: '1rem',
                  color: '#fff',
                  fontFamily: 'Raleway, sans-serif',
                }}
              >
                <Box
                  component="img"
                  src="http://static.lankadeepa.lk/admin/wp-content/uploads/2017/10/20171002Sanda-1.jpg"
                  alt=""
                  sx={{
                    display: 'block',
                    maxWidth: '100%',
                    height: 'auto',
                  }}
                />
              </Typography>
              <Typography
                component="p"
                sx={{
                  marginTop: 0,
                  marginBottom: '1rem',
                  color: '#fff',
                  fontFamily: 'Raleway, sans-serif',
                }}
              >
                Mei odio appareat suscipiantur ad, fabulas salutandi id his. Possit
                civibus scripserit mei ne. Dicant habemus suscipiantur quo ne.
                Persecuti posidonium adversarium vis et.
              </Typography>
              <Typography
                component="p"
                sx={{
                  marginTop: 0,
                  marginBottom: '1rem',
                  color: '#fff',
                  fontFamily: 'Raleway, sans-serif',
                }}
              >
                Velit causae cu usu. Eum eu elitr exerci, ius ei insolens deseruisse.
                In cum sanctus detracto. Mea te oporteat inciderint instructior, summo
                elaboraret id nam, cu omnesque disputando vel. Ut homero epicuri pri,
                dicta detracto voluptatum in has.
              </Typography>
            </Box>
          </Grid>

          {/* Right Column - Ticket Booking */}
          <Grid item xs={12} md={6} sx={{ marginTop: '70px', paddingLeft: { md: '15px' } }}>
            <Typography
              className="right-text hidden-xs"
              sx={{
                fontFamily: 'Raleway, sans-serif',
                fontWeight: 900,
                color: '#fff',
                fontSize: { xs: '30px', md: '60px' },
                lineHeight: 1.1,
                letterSpacing: '0px',
                marginBottom: 0,
                display: { xs: 'none', sm: 'block' },
              }}
            >
              Sanda Sisila @ Nelumpokuna Theater Colombo
            </Typography>

            <Box
              className="row tk-price"
              sx={{
                marginTop: '10px',
                backgroundColor: '#ffffff',
                borderRadius: '13px',
                paddingTop: '0px',
                paddingBottom: '26px',
                paddingLeft: '30px',
                paddingRight: '30px',
              }}
            >
              {/* Showtime Selection */}
              <Box
                sx={{
                  marginTop: '20px',
                  backgroundColor: '#eee',
                  paddingTop: '10px',
                  paddingBottom: '10px',
                  paddingLeft: '15px',
                  paddingRight: '15px',
                  marginBottom: '10px',
                }}
              >
                <Grid container alignItems="center">
                  <Grid item xs={12} sm={8}>
                    <Typography
                      sx={{
                        marginTop: '15px',
                        fontWeight: 700,
                        fontFamily: 'Raleway, sans-serif',
                        fontSize: '14px',
                      }}
                    >
                      show Time (2017 - 12 - 12)
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <RadioGroup
                      row
                      value={selectedShowtime}
                      onChange={handleShowtimeChange}
                      sx={{ justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}
                    >
                      <FormControlLabel
                        value="1"
                        control={<Radio size="small" />}
                        label="2.30 PM"
                        sx={{ '& .MuiFormControlLabel-label': { fontSize: '14px' } }}
                      />
                      <FormControlLabel
                        value="2"
                        control={<Radio size="small" />}
                        label="6.30 PM"
                        sx={{ '& .MuiFormControlLabel-label': { fontSize: '14px' } }}
                      />
                    </RadioGroup>
                  </Grid>
                </Grid>
              </Box>

              {/* Table Header */}
              <Grid
                container
                sx={{
                  borderBottom: '2px solid #444',
                  pb: 1,
                  mb: 2,
                }}
              >
                <Grid item xs={4}>
                  <Typography fontWeight="bold">SEAT TYPE</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography fontWeight="bold">FULL(RS.)</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography fontWeight="bold">Tickets</Typography>
                </Grid>
              </Grid>

              {/* Ticket Categories */}
              {ticketCategories.map((category, index) => (
                <Grid
                  key={index}
                  container
                  sx={{
                    borderBottom: '1px solid #444',
                    pb: 2,
                    mb: 2,
                  }}
                >
                  <Grid item xs={4}>
                    <Typography variant="body2">{category.name}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="body2">Rs.{category.price.toFixed(2)}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <FormControl fullWidth size="small">
                      <Select
                        value={ticketQuantities[category.name]?.toString() || '0'}
                        onChange={(e: SelectChangeEvent) =>
                          handleQuantityChange(category.name, e.target.value)
                        }
                      >
                        {[0, 1, 2, 3, 4, 5].map((num) => (
                          <MenuItem key={num} value={num.toString()}>
                            {num}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              ))}

              {/* Total Summary */}
              <Box
                sx={{
                  borderBottom: '2px solid #444',
                  pb: 2,
                  mb: 2,
                }}
              >
                {ticketCategories.map((category) => {
                  const qty = ticketQuantities[category.name] || 0;
                  if (qty > 0) {
                    return (
                      <Typography key={category.name} variant="body2">
                        {category.name} {qty} x {category.price}/=
                      </Typography>
                    );
                  }
                  return null;
                })}
                <Typography fontWeight="bold" variant="body1" sx={{ mt: 1 }}>
                  Total = {calculateTotal()}/=
                </Typography>
              </Box>

              {/* Next Button */}
              <Button
                variant="contained"
                fullWidth
                onClick={handleNextClick}
                sx={{
                  fontFamily: 'Raleway, sans-serif',
                  fontWeight: 700,
                  color: '#ffffff',
                  backgroundColor: '#ff1955',
                  borderColor: '#ff1955',
                  padding: '1px 27px 0',
                  lineHeight: '48px',
                  border: '1px solid',
                  borderRadius: '25px',
                  letterSpacing: '3.6px',
                  minWidth: '154px',
                  textTransform: 'uppercase',
                  '&:hover': {
                    backgroundColor: '#FFFFFF',
                    color: '#ff1955',
                    borderColor: '#ff1955',
                  },
                }}
              >
                NEXT
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Container>

      {/* Payment Modal */}
      <Dialog
        open={paymentModalOpen}
        onClose={handleCloseModal}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            border: '4px solid #ff688f',
            borderRadius: 0,
          },
        }}
      >
        <DialogTitle
          sx={{
            fontFamily: 'Raleway, sans-serif',
            fontWeight: 600,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          Payment Details
          <IconButton onClick={handleCloseModal} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {/* Customer Information Form */}
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label="Name"
              placeholder="Name"
              value={customerInfo.name}
              onChange={(e) => handleCustomerInfoChange('name', e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Phone No"
              placeholder="phone number"
              value={customerInfo.phone}
              onChange={(e) => handleCustomerInfoChange('phone', e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Email"
              placeholder="email"
              type="email"
              value={customerInfo.email}
              onChange={(e) => handleCustomerInfoChange('email', e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="NIC No"
              placeholder="NIC No"
              value={customerInfo.nic}
              onChange={(e) => handleCustomerInfoChange('nic', e.target.value)}
            />
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Payment Method Selection */}
          <Typography
            variant="h6"
            sx={{
              textAlign: 'center',
              fontFamily: 'Raleway, sans-serif',
              fontWeight: 600,
              mb: 2,
            }}
          >
            Select Your Payment Method
          </Typography>

          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0, maxWidth: '800px', margin: 'auto', p: 2.5 }}>
            {[
              { value: 'visa', img: '/images/visa.jpg', alt: 'Visa' },
              { value: 'master', img: '/images/master.jpg', alt: 'Mastercard' },
              { value: 'amex', img: '/images/amex.jpg', alt: 'Amex' },
              { value: 'hnb', img: '/images/hnb.jpg', alt: 'HNB' },
              { value: 'ezcash', img: '/images/ezcash.jpg', alt: 'eZ Cash' },
            ].map((method) => (
              <Box
                key={method.value}
                onClick={() => setSelectedPaymentMethod(method.value)}
                sx={{
                  flex: 1,
                  padding: '40px',
                  position: 'relative',
                  cursor: 'pointer',
                  boxShadow: 'none',
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    right: '3px',
                    top: '3px',
                    bottom: '3px',
                    left: '3px',
                    backgroundImage: `url(${method.img})`,
                    backgroundSize: 'contain',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    border: selectedPaymentMethod === method.value ? '2px solid #ff1955' : '2px solid transparent',
                    boxShadow: selectedPaymentMethod === method.value ? '0px 3px 22px 0px #7b7b7b' : 'none',
                    transition: 'all 0.5s',
                    '&:hover': {
                      borderColor: '#ff1955',
                    },
                  }}
                />
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseModal} variant="outlined">
            Back
          </Button>
          <Button variant="contained" onClick={() => alert('Payment Processing...')}>
            Payment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EventDetails;
