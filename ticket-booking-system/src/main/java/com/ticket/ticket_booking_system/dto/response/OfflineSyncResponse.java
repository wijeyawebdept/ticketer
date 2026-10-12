package com.ticket.ticket_booking_system.dto.response;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OfflineSyncResponse {

    private int totalSubmitted;
    private int successfullySynced;
    private int duplicatesSkipped;
    private int errorsCount;
    private String message;
    private List<CheckInResponse> results;
}
