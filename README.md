# salsa-picante

> A GitHub App built with [Probot](https://github.com/probot/probot) that manages secret scanning alerts in GitHub repositories.

## Summary

salsa-picante is a GitHub Probot application that automatically manages secret scanning alerts by detecting and handling duplicates. When a new secret scanning alert is created, the app compares it with existing alerts and resolves duplicates according to a priority system:

- Built-in pattern alerts take precedence over custom patterns
- Enterprise custom pattern alerts take precedence over organization custom patterns
- Duplicate alerts are automatically resolved with a reference to the related alert

This automation helps maintain cleaner security alert management and reduces alert fatigue by eliminating redundant notifications for the same secrets.

## Setup

```sh
# Install dependencies
npm install

# Run the bot
npm start
```

## Docker

```sh
# 1. Build container
docker build -t secret-sauce .

# 2. Start container
docker run -e APP_ID=<app-id> -e PRIVATE_KEY=<pem-value> secret-sauce
```

## Contributing

If you have suggestions for how secret-sauce could be improved, or want to report a bug, open an issue! We'd love all and any contributions.

For more, check out the [Contributing Guide](CONTRIBUTING.md).

## License

[ISC](LICENSE) © 2025 David Wiggs
