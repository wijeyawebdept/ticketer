/**
 * Hard-coded venue seating layout for Kularathna Auditorium
 * 
 * This file contains the exact pixel positions for every seat in the venue.
 * The layout matches the Eka Dawasaka Api event seating arrangement.
 * 
 * Layout structure:
 * - STAGE at top
 * - Main seating (curved arc pattern)
 * - BALCONY at bottom
 * 
 * Sections: LEFT, CENTER, RIGHT, BALCONY_LEFT, BALCONY_CENTER, BALCONY_RIGHT
 * 
 * Categories and colors:
 * - VIP_RED: 7,500 LKR (red/pink seats, front center)
 * - VIP_PURPLE: 5,000 LKR (purple seats, sides front)
 * - PREMIUM: 4,000 LKR (blue seats, middle sections)
 * - REGULAR: 3,000 LKR (yellow-green seats, back sections)
 * - BALCONY: 3,000 LKR (gray seats, balcony area)
 */

export interface VenueSeat {
  seatId: string;
  section: 'LEFT' | 'CENTER' | 'RIGHT' | 'BALCONY_LEFT' | 'BALCONY_CENTER' | 'BALCONY_RIGHT';
  row: string;
  number: number;
  category: 'VIP_RED' | 'VIP_PURPLE' | 'PREMIUM' | 'REGULAR' | 'BALCONY';
  x: number;
  y: number;
  isAisleSeat?: boolean;
}

/**
 * Generate seats in a curved arc pattern
 */
function generateArcSeats(
  section: string,
  row: string,
  count: number,
  category: string,
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number
): VenueSeat[] {
  const seats: VenueSeat[] = [];
  const angleStep = (endAngle - startAngle) / (count - 1);
  
  for (let i = 0; i < count; i++) {
    const angle = startAngle + (i * angleStep);
    const x = centerX + radius * Math.cos((angle * Math.PI) / 180);
    const y = centerY + radius * Math.sin((angle * Math.PI) / 180);
    
    seats.push({
      seatId: `${section}-${row}-${String(i + 1).padStart(2, '0')}`,
      section: section as any,
      row,
      number: i + 1,
      category: category as any,
      x: Math.round(x),
      y: Math.round(y),
    });
  }
  
  return seats;
}

/**
 * Generate straight row seats
 */
function generateStraightRow(
  section: string,
  row: string,
  count: number,
  category: string,
  startX: number,
  y: number,
  spacing: number = 20
): VenueSeat[] {
  const seats: VenueSeat[] = [];
  
  for (let i = 0; i < count; i++) {
    seats.push({
      seatId: `${section}-${row}-${String(i + 1).padStart(2, '0')}`,
      section: section as any,
      row,
      number: i + 1,
      category: category as any,
      x: startX + (i * spacing),
      y,
    });
  }
  
  return seats;
}

/**
 * COMPLETE VENUE SEATING LAYOUT
 * Total seats: ~800-1000 (matching the image density)
 */
export const VENUE_SEATING_LAYOUT: VenueSeat[] = [
  // ========================================
  // CENTER SECTION - VIP RED (Front center, closest to stage)
  // ========================================
  ...generateArcSeats('CENTER', 'A', 14, 'VIP_RED', 500, 100, 180, 140, 40),
  ...generateArcSeats('CENTER', 'B', 16, 'VIP_RED', 500, 100, 200, 140, 40),
  
  // ========================================
  // CENTER SECTION - PREMIUM BLUE (Middle center)
  // ========================================
  ...generateArcSeats('CENTER', 'C', 18, 'PREMIUM', 500, 100, 220, 145, 35),
  ...generateArcSeats('CENTER', 'D', 20, 'PREMIUM', 500, 100, 240, 145, 35),
  ...generateArcSeats('CENTER', 'E', 22, 'PREMIUM', 500, 100, 260, 145, 35),
  ...generateArcSeats('CENTER', 'F', 24, 'PREMIUM', 500, 100, 280, 145, 35),
  ...generateArcSeats('CENTER', 'G', 26, 'PREMIUM', 500, 100, 300, 145, 35),
  ...generateArcSeats('CENTER', 'H', 28, 'PREMIUM', 500, 100, 320, 145, 35),
  
  // ========================================
  // CENTER SECTION - REGULAR (Back center)
  // ========================================
  ...generateArcSeats('CENTER', 'I', 30, 'REGULAR', 500, 100, 340, 148, 32),
  ...generateArcSeats('CENTER', 'J', 32, 'REGULAR', 500, 100, 360, 148, 32),
  ...generateArcSeats('CENTER', 'K', 34, 'REGULAR', 500, 100, 380, 150, 30),
  
  // ========================================
  // LEFT SECTION - VIP PURPLE (Front left)
  // ========================================
  ...generateArcSeats('LEFT', 'A', 12, 'VIP_PURPLE', 500, 100, 180, 160, 135),
  ...generateArcSeats('LEFT', 'B', 14, 'VIP_PURPLE', 500, 100, 200, 160, 135),
  
  // ========================================
  // LEFT SECTION - PREMIUM BLUE (Middle left)
  // ========================================
  ...generateArcSeats('LEFT', 'C', 16, 'PREMIUM', 500, 100, 220, 165, 135),
  ...generateArcSeats('LEFT', 'D', 18, 'PREMIUM', 500, 100, 240, 165, 135),
  ...generateArcSeats('LEFT', 'E', 20, 'PREMIUM', 500, 100, 260, 165, 135),
  ...generateArcSeats('LEFT', 'F', 22, 'PREMIUM', 500, 100, 280, 165, 135),
  ...generateArcSeats('LEFT', 'G', 24, 'PREMIUM', 500, 100, 300, 168, 135),
  
  // ========================================
  // LEFT SECTION - REGULAR (Back left)
  // ========================================
  ...generateArcSeats('LEFT', 'H', 26, 'REGULAR', 500, 100, 320, 170, 138),
  ...generateArcSeats('LEFT', 'I', 28, 'REGULAR', 500, 100, 340, 170, 140),
  ...generateArcSeats('LEFT', 'J', 30, 'REGULAR', 500, 100, 360, 172, 142),
  
  // ========================================
  // RIGHT SECTION - VIP PURPLE (Front right)
  // ========================================
  ...generateArcSeats('RIGHT', 'A', 12, 'VIP_PURPLE', 500, 100, 180, 45, 20),
  ...generateArcSeats('RIGHT', 'B', 14, 'VIP_PURPLE', 500, 100, 200, 45, 20),
  
  // ========================================
  // RIGHT SECTION - PREMIUM BLUE (Middle right)
  // ========================================
  ...generateArcSeats('RIGHT', 'C', 16, 'PREMIUM', 500, 100, 220, 45, 15),
  ...generateArcSeats('RIGHT', 'D', 18, 'PREMIUM', 500, 100, 240, 45, 15),
  ...generateArcSeats('RIGHT', 'E', 20, 'PREMIUM', 500, 100, 260, 45, 15),
  ...generateArcSeats('RIGHT', 'F', 22, 'PREMIUM', 500, 100, 280, 45, 15),
  ...generateArcSeats('RIGHT', 'G', 24, 'PREMIUM', 500, 100, 300, 42, 15),
  
  // ========================================
  // RIGHT SECTION - REGULAR (Back right)
  // ========================================
  ...generateArcSeats('RIGHT', 'H', 26, 'REGULAR', 500, 100, 320, 38, 10),
  ...generateArcSeats('RIGHT', 'I', 28, 'REGULAR', 500, 100, 340, 38, 8),
  ...generateArcSeats('RIGHT', 'J', 30, 'REGULAR', 500, 100, 360, 38, 6),
  
  // ========================================
  // BALCONY - LEFT
  // ========================================
  ...generateStraightRow('BALCONY_LEFT', 'A', 15, 'BALCONY', 120, 550, 18),
  ...generateStraightRow('BALCONY_LEFT', 'B', 15, 'BALCONY', 120, 575, 18),
  ...generateStraightRow('BALCONY_LEFT', 'C', 15, 'BALCONY', 120, 600, 18),
  
  // ========================================
  // BALCONY - CENTER
  // ========================================
  ...generateStraightRow('BALCONY_CENTER', 'A', 20, 'BALCONY', 380, 550, 18),
  ...generateStraightRow('BALCONY_CENTER', 'B', 20, 'BALCONY', 380, 575, 18),
  ...generateStraightRow('BALCONY_CENTER', 'C', 20, 'BALCONY', 380, 600, 18),
  
  // ========================================
  // BALCONY - RIGHT
  // ========================================
  ...generateStraightRow('BALCONY_RIGHT', 'A', 15, 'BALCONY', 740, 550, 18),
  ...generateStraightRow('BALCONY_RIGHT', 'B', 15, 'BALCONY', 740, 575, 18),
  ...generateStraightRow('BALCONY_RIGHT', 'C', 15, 'BALCONY', 740, 600, 18),
];

/**
 * Seat category metadata (display only - prices come from backend)
 */
export const SEAT_CATEGORIES = {
  VIP_RED: {
    name: 'VIP',
    color: '#FF4444',
    colorName: 'red',
  },
  VIP_PURPLE: {
    name: 'VIP',
    color: '#C41AE5',
    colorName: 'purple',
  },
  PREMIUM: {
    name: 'Premium',
    color: '#6B7CFF',
    colorName: 'blue',
  },
  REGULAR: {
    name: 'Regular',
    color: '#A8B400',
    colorName: 'yellow-green',
  },
  BALCONY: {
    name: 'Balcony',
    color: '#9E9E9E',
    colorName: 'gray',
  },
};

/**
 * Get seats by section
 */
export function getSeatsBySection(section: string): VenueSeat[] {
  return VENUE_SEATING_LAYOUT.filter(seat => seat.section === section);
}

/**
 * Get seats by category
 */
export function getSeatsByCategory(category: string): VenueSeat[] {
  return VENUE_SEATING_LAYOUT.filter(seat => seat.category === category);
}

/**
 * Get seat by ID
 */
export function getSeatById(seatId: string): VenueSeat | undefined {
  return VENUE_SEATING_LAYOUT.find(seat => seat.seatId === seatId);
}

/**
 * Get total seat count
 */
export function getTotalSeats(): number {
  return VENUE_SEATING_LAYOUT.length;
}

/**
 * Get seat count by category
 */
export function getSeatCountByCategory() {
  const counts: Record<string, number> = {};
  
  VENUE_SEATING_LAYOUT.forEach(seat => {
    counts[seat.category] = (counts[seat.category] || 0) + 1;
  });
  
  return counts;
}
