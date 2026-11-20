package com.acme.salary.common;

import java.math.BigDecimal;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

public final class SalaryRules {
    private static final Map<String, String> CURRENCIES_BY_COUNTRY = Map.of(
            "IN", "INR", "US", "USD", "GB", "GBP", "DE", "EUR", "FR", "EUR", "SG", "SGD");
    private static final Pattern AMOUNT = Pattern.compile("[0-9]{1,16}(\\.[0-9]{1,2})?");

    private SalaryRules() {}

    public static String country(String value, String field) {
        String code = value == null ? "" : value.strip().toUpperCase(Locale.ROOT);
        if (!CURRENCIES_BY_COUNTRY.containsKey(code)) {
            throw new ApiException.Invalid(field, "Choose a supported country.");
        }
        return code;
    }

    public static String currency(String value, String field) {
        String code = value == null ? "" : value.strip().toUpperCase(Locale.ROOT);
        if (!CURRENCIES_BY_COUNTRY.containsValue(code)) {
            throw new ApiException.Invalid(field, "Choose a supported currency.");
        }
        return code;
    }

    public static String localCurrency(String country) {
        return CURRENCIES_BY_COUNTRY.get(country);
    }

    public static BigDecimal amount(String text, String field) {
        if (text == null || !AMOUNT.matcher(text.strip()).matches()) {
            throw new ApiException.Invalid(field, "Enter a non-negative amount with up to 16 whole digits and two decimal places.");
        }
        return new BigDecimal(text.strip()).setScale(2);
    }
}
