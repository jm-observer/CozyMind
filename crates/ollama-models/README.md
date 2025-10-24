# Ollama Models

A Rust library providing data structures and utilities for working with Ollama API requests and responses.

## Features

- **OllamaRequest**: Structure for making requests to Ollama API
- **OllamaResponse**: Structure for handling Ollama API responses
- **PerformanceStats**: Performance monitoring and statistics
- **Serialization**: Full serde support for JSON serialization/deserialization

## Usage

Add this to your `Cargo.toml`:

```toml
[dependencies]
ollama-models = { path = "../crates/ollama-models" }
```

## Examples

### Basic Request/Response

```rust
use ollama_models::{OllamaRequest, OllamaResponse};

// Create a request
let request = OllamaRequest {
    model: "llama2".to_string(),
    prompt: "Hello, world!".to_string(),
    stream: false,
    context: None,
};

// Handle response
let response: OllamaResponse = serde_json::from_str(&json_string)?;
println!("Response: {}", response.response);
```

### Performance Monitoring

```rust
use ollama_models::OllamaResponse;

let response: OllamaResponse = /* ... */;

// Get performance statistics
let stats = response.performance_stats();
println!("Performance: {}", stats.format_summary());
println!("Detailed report:\n{}", stats.detailed_report());
```

## License

This project is licensed under the same terms as the parent project.
