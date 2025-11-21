/**
 * Environment variable validation
 * Validates that all required environment variables are set
 */

interface EnvVarConfig {
  name: string;
  required: boolean;
  description: string;
}

const REQUIRED_ENV_VARS: EnvVarConfig[] = [
  {
    name: 'DATABASE_URL',
    required: true,
    description: 'PostgreSQL database connection string (Neon)',
  },
  {
    name: 'NEXTAUTH_URL',
    required: true,
    description: 'Base URL for NextAuth',
  },
  {
    name: 'NEXTAUTH_SECRET',
    required: true,
    description: 'Secret key for NextAuth session encryption',
  },
  {
    name: 'BLOB_READ_WRITE_TOKEN',
    required: true,
    description: 'Vercel Blob storage access token',
  },
];

export function validateEnvironmentVariables(): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const config of REQUIRED_ENV_VARS) {
    const value = process.env[config.name];

    if (config.required && !value) {
      errors.push(
        `Missing required environment variable: ${config.name} - ${config.description}`
      );
    } else if (!value) {
      warnings.push(
        `Optional environment variable not set: ${config.name} - ${config.description}`
      );
    }
  }

  // Additional validation for specific env vars
  if (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length < 32) {
    errors.push(
      'NEXTAUTH_SECRET must be at least 32 characters long for security'
    );
  }

  if (process.env.NODE_ENV === 'production') {
    if (process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.startsWith('https://')) {
      warnings.push(
        'NEXTAUTH_URL should use HTTPS in production for security'
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateOrThrow(): void {
  const validation = validateEnvironmentVariables();

  if (!validation.valid) {
    console.error('Environment variable validation failed:');
    validation.errors.forEach((error) => console.error(`  ❌ ${error}`));

    if (validation.warnings.length > 0) {
      console.warn('\nWarnings:');
      validation.warnings.forEach((warning) => console.warn(`  ⚠️  ${warning}`));
    }

    throw new Error(
      'Missing required environment variables. Please check your .env file.'
    );
  }

  if (validation.warnings.length > 0) {
    console.warn('Environment variable warnings:');
    validation.warnings.forEach((warning) => console.warn(`  ⚠️  ${warning}`));
  }
}
