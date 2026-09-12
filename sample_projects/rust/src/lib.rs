//! Tiny temperature converter used as a gitreqd tracing example.
//!
//! Tag implementation with `#[gitreqd::implements]` and tests with
//! `#[gitreqd::verifies]` so `gitreqd html` can list source links.

extern crate gitreqd_macros as gitreqd;

/// Convert Celsius to Fahrenheit: `F = C * 9 / 5 + 32`.
#[gitreqd::implements("TEMP-001")]
pub fn celsius_to_fahrenheit(celsius: f64) -> f64 {
    celsius * 9.0 / 5.0 + 32.0
}

/// Convert Fahrenheit to Celsius: `C = (F - 32) * 5 / 9`.
#[gitreqd::implements("TEMP-002")]
pub fn fahrenheit_to_celsius(fahrenheit: f64) -> f64 {
    (fahrenheit - 32.0) * 5.0 / 9.0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[gitreqd::verifies("TEMP-001")]
    #[test]
    fn converts_freezing_and_boiling_from_celsius() {
        assert_eq!(celsius_to_fahrenheit(0.0), 32.0);
        assert_eq!(celsius_to_fahrenheit(100.0), 212.0);
    }

    #[gitreqd::verifies("TEMP-002")]
    #[test]
    fn converts_freezing_and_boiling_from_fahrenheit() {
        assert_eq!(fahrenheit_to_celsius(32.0), 0.0);
        assert_eq!(fahrenheit_to_celsius(212.0), 100.0);
    }

    #[gitreqd::verifies("TEMP-001", "TEMP-002")]
    #[test]
    fn round_trips_freezing_point() {
        assert_eq!(fahrenheit_to_celsius(celsius_to_fahrenheit(0.0)), 0.0);
        assert_eq!(celsius_to_fahrenheit(fahrenheit_to_celsius(32.0)), 32.0);
    }
}
