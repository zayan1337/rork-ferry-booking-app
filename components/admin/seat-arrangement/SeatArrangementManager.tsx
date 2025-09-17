import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '@/constants/adminColors';
import { AdminManagement } from '@/types';
import FlexibleSeatManager from './FlexibleSeatManager';

type Seat = AdminManagement.Seat;
type SeatLayout = AdminManagement.SeatLayout;

interface SeatArrangementManagerProps {
  vesselId: string;
  initialLayout?: SeatLayout;
  initialSeats?: Seat[];
  seatingCapacity?: number;
  vesselType?: string;
  onSave: (layout: SeatLayout, seats: Seat[]) => Promise<void>;
  onChange?: (layout: SeatLayout, seats: Seat[]) => void;
  onCancel?: () => void;
  loading?: boolean;
}

export default function SeatArrangementManager({
  vesselId,
  initialLayout,
  initialSeats = [],
  seatingCapacity = 0,
  vesselType = 'passenger',
  onSave,
  onChange,
  onCancel,
  loading = false,
}: SeatArrangementManagerProps) {
  return (
    <View style={styles.container}>
      {/* Flexible Ferry Layout */}
      <View style={styles.flexibleContainer}>
        <FlexibleSeatManager
          vesselId={vesselId}
          initialSeats={initialSeats}
          seatingCapacity={seatingCapacity}
          vesselType={vesselType}
          onSave={async seats => {
            // Create a flexible layout data structure for ferry layouts
            const maxRows = Math.max(...seats.map(s => s.row_number), 0);
            const maxCols = Math.max(...seats.map(s => s.position_x), 0);

            const layoutData: SeatLayout = {
              id: initialLayout?.id || '',
              vessel_id: vesselId,
              layout_name: `Flexible Ferry Layout - ${new Date().toLocaleDateString()}`,
              layout_data: {
                rows: maxRows,
                columns: maxCols,
                aisles: [], // Flexible layout doesn't use global aisles
                rowAisles: [],
                premium_rows: [
                  ...new Set(
                    seats.filter(s => s.is_premium).map(s => s.row_number)
                  ),
                ],
                disabled_seats: seats
                  .filter(s => s.is_disabled)
                  .map(s => s.seat_number),
                crew_seats: seats
                  .filter(s => s.seat_type === 'crew')
                  .map(s => s.seat_number),
                floors: [
                  {
                    floor_number: 1,
                    floor_name: 'Main Deck',
                    rows: maxRows,
                    columns: maxCols,
                    aisles: [], // Flexible layout uses per-seat aisle info
                    rowAisles: [],
                    premium_rows: [
                      ...new Set(
                        seats.filter(s => s.is_premium).map(s => s.row_number)
                      ),
                    ],
                    disabled_seats: seats
                      .filter(s => s.is_disabled)
                      .map(s => s.seat_number),
                    crew_seats: seats
                      .filter(s => s.seat_type === 'crew')
                      .map(s => s.seat_number),
                    is_active: true,
                    seat_count: seats.length,
                  },
                ],
                // Add flexible layout metadata
                layout_type: 'flexible',
                ferry_layout: true,
              },
              is_active: true,
              created_at: initialLayout?.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            await onSave(layoutData, seats);
          }}
          onChange={
            onChange
              ? seats => {
                  const maxRows = Math.max(...seats.map(s => s.row_number), 0);
                  const maxCols = Math.max(...seats.map(s => s.position_x), 0);

                  const layoutData: SeatLayout = {
                    id: initialLayout?.id || '',
                    vessel_id: vesselId,
                    layout_name: `Flexible Ferry Layout - ${new Date().toLocaleDateString()}`,
                    layout_data: {
                      rows: maxRows,
                      columns: maxCols,
                      aisles: [], // Flexible layout doesn't use global aisles
                      rowAisles: [],
                      premium_rows: [
                        ...new Set(
                          seats.filter(s => s.is_premium).map(s => s.row_number)
                        ),
                      ],
                      disabled_seats: seats
                        .filter(s => s.is_disabled)
                        .map(s => s.seat_number),
                      crew_seats: seats
                        .filter(s => s.seat_type === 'crew')
                        .map(s => s.seat_number),
                      floors: [
                        {
                          floor_number: 1,
                          floor_name: 'Main Deck',
                          rows: maxRows,
                          columns: maxCols,
                          aisles: [], // Flexible layout uses per-seat aisle info
                          rowAisles: [],
                          premium_rows: [
                            ...new Set(
                              seats
                                .filter(s => s.is_premium)
                                .map(s => s.row_number)
                            ),
                          ],
                          disabled_seats: seats
                            .filter(s => s.is_disabled)
                            .map(s => s.seat_number),
                          crew_seats: seats
                            .filter(s => s.seat_type === 'crew')
                            .map(s => s.seat_number),
                          is_active: true,
                          seat_count: seats.length,
                        },
                      ],
                      // Add flexible layout metadata
                      layout_type: 'flexible',
                      ferry_layout: true,
                    },
                    is_active: true,
                    created_at:
                      initialLayout?.created_at || new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  };
                  onChange(layoutData, seats);
                }
              : undefined
          }
          onCancel={onCancel}
          loading={loading}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flexibleContainer: {
    flex: 1,
  },
});
