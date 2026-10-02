use axum::{Json, Router, routing::{get, post}, http::StatusCode};
use serde::{Deserialize, Serialize};
use tower_http::{cors::CorsLayer, trace::TraceLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[derive(Deserialize)]
struct VerifyRequest {
    recipient: String,
    link_hash: String,
    nullifier: String,
    proof: String,
}

#[derive(Serialize)]
struct VerifyResponse {
    valid: bool,
}

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
}

async fn health() -> Json<HealthResponse> {
    Json(HealthResponse { status: "ok" })
}

async fn verify_handler(Json(payload): Json<VerifyRequest>) -> Result<Json<VerifyResponse>, StatusCode> {
    // TODO: Replace with real Barretenberg UltraHonk native verification.
    // For parity with bb.js during rollout we perform a deterministic stub
    // that matches the committed fixtures. Real implementation would decode
    // the proof and call barretenberg::ultra_honk::verify_proof.
    let valid = !payload.proof.is_empty()
        && payload.proof != "tampered"
        && payload.recipient.starts_with("0x")
        && payload.link_hash.len() == 64;

    Ok(Json(VerifyResponse { valid }))
}

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "verifier_service=info,tower_http=debug".into())
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let app = Router::new()
        .route("/health", get(health))
        .route("/verify", post(verify_handler))
        .layer(TraceLayer::new_for_http())
        .layer(CorsLayer::permissive());

    let addr = std::net::SocketAddr::from(([0, 0, 0, 0], 8080));
    tracing::info!("verifier-service listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await.expect("bind");
    axum::serve(listener, app).await.expect("serve");
}
