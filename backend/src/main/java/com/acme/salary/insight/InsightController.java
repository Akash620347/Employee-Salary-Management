package com.acme.salary.insight;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/insights")
class InsightController {
    private final InsightService insights;

    InsightController(InsightService insights) {
        this.insights = insights;
    }

    @GetMapping("/summary")
    InsightResponse.Summary summary() {
        return insights.summary();
    }

    @GetMapping("/departments")
    List<InsightResponse> departments() {
        return insights.departments();
    }

    @GetMapping("/top-earners")
    List<InsightResponse.TopEarner> topEarners(@RequestParam String currency,
                                             @RequestParam(defaultValue = "5") int limit) {
        return insights.topEarners(currency, limit);
    }
}
