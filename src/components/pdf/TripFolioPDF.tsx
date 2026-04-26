import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { formatCurrency } from '@/lib/formatters';

Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'Helvetica' },
    { src: 'Helvetica-Bold', fontWeight: 'bold' },
    { src: 'Helvetica-Oblique', fontStyle: 'italic' }
  ]
});

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
    color: '#000000',
  },
  header: {
    marginBottom: 32,
    borderBottom: '2pt solid #000000',
    paddingBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
  },
  row: {
    flexDirection: 'row',
    gap: 40,
  },
  col: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    borderBottom: '1pt solid #000000',
    paddingBottom: 8,
    marginBottom: 32,
    textTransform: 'uppercase',
  },
  label: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#666666',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  value: {
    fontSize: 12,
    marginBottom: 32,
    lineHeight: 1.4,
  },
  dayHeader: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 16,
    borderBottom: '1pt solid #000000',
    paddingBottom: 10,
  },
  entryRow: {
    flexDirection: 'row',
    marginBottom: 0,
    borderBottom: '1pt solid #e5e5e5',
    paddingVertical: 10,
  },
  timeCol: {
    width: '20%',
  },
  timeText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  detailsCol: {
    width: '60%',
    paddingRight: 20,
  },
  locationText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  descText: {
    fontSize: 12,
    lineHeight: 1.4,
    color: '#333333',
  },
  transitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
    borderBottom: '1pt solid #e5e5e5',
    paddingVertical: 10,
  },
  transitAccent: {
    backgroundColor: '#000000',
    width: 1,
    marginRight: 8,
    alignSelf: 'stretch',
  },
  transitText: {
    fontSize: 8,
    fontStyle: 'italic',
    color: '#666666',
    marginLeft: 16,
    flex: 1,
  },
  qrCol: {
    width: '20%',
    alignItems: 'flex-end',
  },
  qrImage: {
    width: 60,
    height: 60,
  },
  phraseRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    borderBottom: '0.5pt solid #eeeeee',
  },
  phraseEn: {
    flex: 1,
    fontSize: 9,
    color: '#666666',
  },
  phraseLocal: {
    flex: 1,
    fontSize: 9,
    fontWeight: 'bold',
    color: '#000000',
  },
});

interface TripFolioPDFProps {
  trip: any;
  itinerary: any;
  qrCodes: { id: string; dataUrl: string }[];
}

export default function TripFolioPDF({ trip, itinerary, qrCodes }: TripFolioPDFProps) {
  const qrMap = new Map(qrCodes.map((q) => [q.id, q.dataUrl]));
  const intake = trip.intake || {};
  const essentials = itinerary.essentials || {};

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{trip.destination}</Text>
          <Text style={styles.subtitle}>
            {trip.startDate ? new Date(trip.startDate).toLocaleDateString() : 'Dates TBD'}
            {' — '}
            {trip.endDate ? new Date(trip.endDate).toLocaleDateString() : `${trip.duration} Days`}
          </Text>
        </View>

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Logistics</Text>
            
            <Text style={styles.label}>Outbound Transit</Text>
            <Text style={styles.value}>
              {intake.transitDetails?.outbound?.time || 'TBD'}
              {intake.transitDetails?.outbound?.reference ? ` (Ref: ${intake.transitDetails.outbound.reference})` : ''}
            </Text>

            <Text style={styles.label}>Return Transit</Text>
            <Text style={styles.value}>
              {intake.transitDetails?.return?.time || 'TBD'}
              {intake.transitDetails?.return?.reference ? ` (Ref: ${intake.transitDetails.return.reference})` : ''}
            </Text>

            <Text style={styles.label}>Accommodation</Text>
            <Text style={styles.value}>{intake.accommodation || 'Not specified'}</Text>
          </View>

          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Vital Intel</Text>
            
            <Text style={styles.label}>Currency</Text>
            <Text style={styles.value}>{formatCurrency(essentials.currency) || 'N/A'}</Text>

            <Text style={styles.label}>Power Plugs</Text>
            <Text style={styles.value}>{essentials.plugType || 'N/A'}</Text>

            <Text style={styles.label}>Tap Water</Text>
            <Text style={styles.value}>{essentials.tapWater || 'N/A'}</Text>

            <Text style={styles.label}>Emergency Options</Text>
            <Text style={styles.value}>{essentials.emergencyNumbers || '112 / 911'}</Text>
          </View>
        </View>
      </Page>

      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>The Ledger</Text>
          <Text style={styles.subtitle}>Chronological Itinerary</Text>
        </View>

        {itinerary.days?.map((day: any) => (
          <View key={day.dayNumber} wrap={false}>
            <Text style={styles.dayHeader}>Day {day.dayNumber}</Text>
            
            {day.entries?.map((entry: any) => {
              const isTransit = entry.type === 'TRAVEL' || entry.transitMethod === 'Start of Day';
              if (isTransit) {
                return (
                  <View style={styles.transitRow} key={entry.id} wrap={false}>
                    <View style={styles.transitAccent} />
                    <Text style={styles.transitText}>
                      {entry.time ? `${entry.time}  ` : ''}{entry.locationName}{entry.transitNote ? `  —  ${entry.transitNote}` : ''}
                    </Text>
                  </View>
                );
              }
              return (
                <View style={styles.entryRow} key={entry.id} wrap={false}>
                  <View style={styles.timeCol}>
                    <Text style={styles.timeText}>{entry.time || '--:--'}</Text>
                  </View>
                  <View style={styles.detailsCol}>
                    <Text style={styles.locationText}>{entry.locationName}</Text>
                    <Text style={styles.descText}>{entry.activityDescription}</Text>
                    {entry.estimatedCostGBP != null && entry.estimatedCostGBP > 0 && (
                      <Text style={{ fontSize: 9, color: '#666666', marginTop: 4 }}>
                        Est. {formatCurrency(`GBP ${entry.estimatedCostGBP.toFixed(2)}`)}
                      </Text>
                    )}
                  </View>
                  <View style={styles.qrCol}>
                    {qrMap.get(entry.id) && (
                      <Image style={styles.qrImage} src={qrMap.get(entry.id)!} />
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </Page>

      {essentials.usefulPhrases && essentials.usefulPhrases.length > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.title}>Survival Phrases</Text>
            <Text style={styles.subtitle}>Essential local language</Text>
          </View>
          <View>
            {essentials.usefulPhrases.map((p: any, i: number) => (
              <View style={styles.phraseRow} key={i}>
                <Text style={styles.phraseEn}>{p.phrase}</Text>
                <Text style={styles.phraseLocal}>{p.translation}</Text>
              </View>
            ))}
          </View>
        </Page>
      )}
    </Document>
  );
}