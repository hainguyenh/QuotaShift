#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct OAuthRefreshAttempt {
    pub name: &'static str,
    pub client_id: String,
    pub client_secret: Option<String>,
}

fn normalize_client_id(value: String) -> Option<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() || !trimmed.ends_with(".apps.googleusercontent.com") {
        return None;
    }
    Some(trimmed.to_string())
}

fn normalize_secret(value: String) -> Option<String> {
    let trimmed = value.trim();
    (!trimmed.is_empty()).then(|| trimmed.to_string())
}

fn push_attempt(
    attempts: &mut Vec<OAuthRefreshAttempt>,
    name: &'static str,
    client_id: String,
    client_secret: Option<String>,
) {
    let Some(client_id) = normalize_client_id(client_id) else {
        return;
    };
    if attempts
        .iter()
        .any(|attempt| attempt.client_id == client_id)
    {
        return;
    }
    attempts.push(OAuthRefreshAttempt {
        name,
        client_id,
        client_secret: client_secret.and_then(normalize_secret),
    });
}

pub(crate) fn build_refresh_attempts(
    auth_method: Option<&str>,
    original_client_id: String,
    consumer_client_id: String,
    consumer_client_secret: String,
    enterprise_client_id: String,
    enterprise_client_secret: String,
) -> Vec<OAuthRefreshAttempt> {
    let mut attempts = Vec::new();
    let original = ("original", original_client_id, None);
    let consumer = ("consumer", consumer_client_id, Some(consumer_client_secret));
    let enterprise = (
        "enterprise",
        enterprise_client_id,
        Some(enterprise_client_secret),
    );

    let ordered = match auth_method {
        Some("enterprise") => [enterprise, original, consumer],
        Some("original") => [original, consumer, enterprise],
        _ => [consumer, original, enterprise],
    };

    for (name, client_id, client_secret) in ordered {
        push_attempt(&mut attempts, name, client_id, client_secret);
    }
    attempts
}

#[cfg(test)]
mod tests {
    use super::*;

    const CONSUMER: &str = "1071006060-consumer.apps.googleusercontent.com";
    const ENTERPRISE: &str = "8843549190-enterprise.apps.googleusercontent.com";

    #[test]
    fn skips_empty_enterprise_client_id_and_uses_valid_consumer_fallback() {
        let attempts = build_refresh_attempts(
            Some("enterprise"),
            String::new(),
            CONSUMER.to_string(),
            "consumer-secret".to_string(),
            String::new(),
            String::new(),
        );

        assert_eq!(attempts.len(), 1);
        assert_eq!(attempts[0].name, "consumer");
        assert_eq!(attempts[0].client_id, CONSUMER);
    }

    #[test]
    fn enterprise_auth_prefers_enterprise_credentials_when_available() {
        let attempts = build_refresh_attempts(
            Some("enterprise"),
            String::new(),
            CONSUMER.to_string(),
            "consumer-secret".to_string(),
            ENTERPRISE.to_string(),
            "enterprise-secret".to_string(),
        );

        assert_eq!(attempts[0].name, "enterprise");
        assert_eq!(attempts[0].client_id, ENTERPRISE);
        assert_eq!(
            attempts[0].client_secret.as_deref(),
            Some("enterprise-secret")
        );
    }

    #[test]
    fn invalid_client_ids_are_never_emitted() {
        let attempts = build_refresh_attempts(
            None,
            "not-a-google-client".to_string(),
            " ".to_string(),
            "secret".to_string(),
            String::new(),
            String::new(),
        );

        assert!(attempts.is_empty());
    }
}
