package com.ticketbooking.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.ticketbooking.entity.VenueSeat;

@Repository
public interface VenueSeatRepository extends JpaRepository<VenueSeat, String> {

    List<VenueSeat> findBySection(String section);

    List<VenueSeat> findByRowLabel(String rowLabel);

    @Query("SELECT vs FROM VenueSeat vs ORDER BY vs.section, vs.rowLabel, vs.seatNumber")
    List<VenueSeat> findAllOrderedByLayout();

    @Query("SELECT vs FROM VenueSeat vs WHERE vs.section = ?1 ORDER BY vs.rowLabel, vs.seatNumber")
    List<VenueSeat> findBySectionOrdered(String section);
}
