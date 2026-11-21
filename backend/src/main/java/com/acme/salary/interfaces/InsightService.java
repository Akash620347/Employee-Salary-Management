package com.acme.salary.interfaces;

import com.acme.salary.dto.InsightResponse;

import java.util.List;

public interface InsightService {
    InsightResponse.Summary summary();
    List<InsightResponse> departments();
    List<InsightResponse.TopEarner> topEarners(String currency, int limit);
}
