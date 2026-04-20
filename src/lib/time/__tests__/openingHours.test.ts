import { checkIfVenueIsClosed, parseTimeToMinutes } from '../openingHours';

describe('openingHours', () => {
  describe('parseTimeToMinutes', () => {
    it('parses AM/PM times correctly', () => {
      expect(parseTimeToMinutes('12:00 AM')).toBe(0);
      expect(parseTimeToMinutes('12:00 PM')).toBe(720);
      expect(parseTimeToMinutes('9:30 AM')).toBe(570);
      expect(parseTimeToMinutes('11:59 PM')).toBe(1439);
    });

    it('parses 24hr times correctly', () => {
      expect(parseTimeToMinutes('00:00')).toBe(0);
      expect(parseTimeToMinutes('12:00')).toBe(720);
      expect(parseTimeToMinutes('14:30')).toBe(870);
    });
  });

  describe('checkIfVenueIsClosed', () => {
    // Helper to generate Google Places weekdayDescriptions array
    // Google index: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
    const createDescriptions = (activeDayIndex: number, text: string) => {
      const descriptions = Array(7).fill('Day: 9:00 AM – 5:00 PM');
      descriptions[activeDayIndex] = text;
      return descriptions;
    };

    // Sunday (jsDay 0, googleIndex 6)
    const sundayDate = new Date('2023-10-01T12:00:00Z'); 
    
    // Monday (jsDay 1, googleIndex 0)
    const mondayDate = new Date('2023-10-02T12:00:00Z');

    it('1. Normal open hours — visit within range → false', () => {
      const descriptions = createDescriptions(0, 'Monday: 9:00 AM – 5:00 PM');
      expect(checkIfVenueIsClosed(mondayDate, '14:00', descriptions)).toBe(false);
    });

    it('2. Normal open hours — visit outside range → true', () => {
      const descriptions = createDescriptions(0, 'Monday: 9:00 AM – 5:00 PM');
      expect(checkIfVenueIsClosed(mondayDate, '18:00', descriptions)).toBe(true);
    });

    it('3. "Closed" day string → true', () => {
      const descriptions = createDescriptions(0, 'Monday: Closed');
      expect(checkIfVenueIsClosed(mondayDate, '12:00', descriptions)).toBe(true);
    });

    it('4. "Open 24 hours" → false', () => {
      const descriptions = createDescriptions(0, 'Monday: Open 24 hours');
      expect(checkIfVenueIsClosed(mondayDate, '03:00', descriptions)).toBe(false);
    });

    it('5. Overnight hours — visit before midnight → false', () => {
      const descriptions = createDescriptions(0, 'Monday: 8:00 PM – 2:00 AM');
      expect(checkIfVenueIsClosed(mondayDate, '22:00', descriptions)).toBe(false);
    });

    it('6. Overnight hours — visit after midnight but before close → false', () => {
      const descriptions = createDescriptions(0, 'Monday: 8:00 PM – 2:00 AM');
      expect(checkIfVenueIsClosed(mondayDate, '01:00', descriptions)).toBe(false);
    });

    it('7. Overnight hours — visit after close but before open → true', () => {
      const descriptions = createDescriptions(0, 'Monday: 8:00 PM – 2:00 AM');
      expect(checkIfVenueIsClosed(mondayDate, '12:00', descriptions)).toBe(true);
    });

    it('8. Malformed string → false (fail-safe)', () => {
      const descriptions = createDescriptions(0, 'Monday: invalid format bla bla');
      expect(checkIfVenueIsClosed(mondayDate, '12:00', descriptions)).toBe(false);
    });

    it('9. Empty weekdayDescriptions array → false', () => {
      expect(checkIfVenueIsClosed(mondayDate, '12:00', [])).toBe(false);
    });

    it('10. Sunday mapping — JS getDay()=0 maps to Google index 6', () => {
      const descriptions = createDescriptions(6, 'Sunday: 10:00 AM – 4:00 PM');
      expect(checkIfVenueIsClosed(sundayDate, '18:00', descriptions)).toBe(true); // Closed at 18:00
      expect(checkIfVenueIsClosed(sundayDate, '12:00', descriptions)).toBe(false); // Open at 12:00
    });

    it('11. Monday mapping — JS getDay()=1 maps to Google index 0', () => {
      const descriptions = createDescriptions(0, 'Monday: 10:00 AM – 4:00 PM');
      expect(checkIfVenueIsClosed(mondayDate, '18:00', descriptions)).toBe(true);
      expect(checkIfVenueIsClosed(mondayDate, '12:00', descriptions)).toBe(false);
    });
    
    it('12. Empty visitTimeStr → false', () => {
      const descriptions = createDescriptions(0, 'Monday: 9:00 AM – 5:00 PM');
      expect(checkIfVenueIsClosed(mondayDate, '', descriptions)).toBe(false);
    });
  });
});