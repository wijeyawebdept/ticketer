# Ticket Booking System - Admin Dashboard

This is the admin dashboard for the Ticket Booking System application. It provides a comprehensive interface for managing events, users, bookings, and transactions.

## Features

- **Authentication**: Secure login system with role-based access control
- **Dashboard Overview**: Visual analytics of system performance and key metrics
- **Event Management**: Create, edit, and delete events
- **User Management**: Manage user accounts and roles
- **Booking Management**: View and manage ticket bookings
- **Transaction Management**: Track payment details and transaction history
- **Settings**: Configure system and user preferences

## Technologies Used

- React
- TypeScript
- Material UI
- React Router
- Chart.js
- Formik
- Axios

## Getting Started

### Prerequisites

- Node.js (v14.0.0 or later)
- npm (v6.0.0 or later)

### Installation

1. Clone the repository
2. Navigate to the project directory: `cd ticket-booking-admin`
3. Install dependencies: `npm install`
4. Start the development server: `npm start`

### Configuration

The application is configured to connect to a Spring Boot backend running on `http://localhost:8080`. You can modify this configuration in the `.env` file and `setupProxy.js`.

## API Integration

This admin dashboard connects to a Spring Boot backend API. Make sure the backend server is running before testing the admin features.

## Available Scripts

In the project directory, you can run:

- `npm start`: Runs the app in development mode
- `npm build`: Builds the app for production
- `npm test`: Runs tests
- `npm eject`: Ejects from create-react-app

## License

This project is licensed under the MIT License - see the LICENSE file for details.