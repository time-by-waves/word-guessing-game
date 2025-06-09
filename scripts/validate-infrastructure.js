#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class InfrastructureValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.info = [];
    this.projectRoot = path.resolve(__dirname, '..');
  }

  log(level, message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}`;

    console.info(logEntry);

    switch (level) {
      case 'ERROR':
        this.errors.push(message);
        break;
      case 'WARN':
        this.warnings.push(message);
        break;
      case 'INFO':
        this.info.push(message);
        break;
    }
  }

  // Check if required files exist
  validateRequiredFiles() {
    this.log('INFO', 'Validating required files...');

    const requiredFiles = [
      'package.json',
      'docker-compose.yml',
      'Dockerfile',
      '.github/workflows/ci.yml',
      '.github/workflows/cd.yml',
      'scripts/setup-project.sh',
      'scripts/setup-secrets.sh',
      'infrastructure/server/setup-linux-vm.md',
    ];

    requiredFiles.forEach(file => {
      const filePath = path.join(this.projectRoot, file);
      if (!fs.existsSync(filePath)) {
        this.log('ERROR', `Required file missing: ${file}`);
      } else {
        this.log('INFO', `✅ Found required file: ${file}`);
      }
    });
  }

  // Validate environment variables
  validateEnvironmentVariables() {
    this.log('INFO', 'Validating environment variables...');

    const requiredEnvVars = {
      development: ['NODE_ENV', 'DATABASE_URL', 'REDIS_URL', 'SESSION_SECRET'],
      production: [
        'NODE_ENV',
        'DATABASE_URL',
        'REDIS_URL',
        'SESSION_SECRET',
        'JWT_SECRET',
        'CORS_ORIGIN',
      ],
      infrastructure: [
        'BINARYLANE_API_TOKEN',
        'GITHUB_REPO',
        'BASTION_HOST_IP',
      ],
    };

    // Check development environment
    const nodeEnv = process.env.NODE_ENV || 'development';
    const envVarsToCheck =
      requiredEnvVars[nodeEnv] || requiredEnvVars.development;

    envVarsToCheck.forEach(envVar => {
      if (!process.env[envVar]) {
        this.log('WARN', `Environment variable not set: ${envVar}`);
      } else {
        this.log('INFO', `✅ Environment variable set: ${envVar}`);
      }
    });

    // Check infrastructure variables (optional)
    requiredEnvVars.infrastructure.forEach(envVar => {
      if (!process.env[envVar]) {
        this.log(
          'INFO',
          `Infrastructure variable not set: ${envVar} (required for provisioning)`
        );
      } else {
        this.log('INFO', `✅ Infrastructure variable set: ${envVar}`);
      }
    });
  }

  // Validate package.json
  validatePackageJson() {
    this.log('INFO', 'Validating package.json...');

    try {
      const packagePath = path.join(this.projectRoot, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

      // Check required scripts
      const requiredScripts = [
        'start',
        'dev',
        'test',
        'lint',
        'db:migrate',
        'infra:secrets',
        'health:check',
      ];

      requiredScripts.forEach(script => {
        if (!packageJson.scripts || !packageJson.scripts[script]) {
          this.log('ERROR', `Missing required script: ${script}`);
        } else {
          this.log('INFO', `✅ Found script: ${script}`);
        }
      });

      // Check Node.js version
      if (packageJson.engines && packageJson.engines.node) {
        this.log(
          'INFO',
          `✅ Node.js version constraint: ${packageJson.engines.node}`
        );
      } else {
        this.log('WARN', 'No Node.js version constraint specified');
      }

      // Check dependencies
      const criticalDeps = ['winston'];
      criticalDeps.forEach(dep => {
        if (!packageJson.dependencies || !packageJson.dependencies[dep]) {
          this.log('ERROR', `Missing critical dependency: ${dep}`);
        } else {
          this.log('INFO', `✅ Found dependency: ${dep}`);
        }
      });
    } catch (error) {
      this.log('ERROR', `Failed to parse package.json: ${error.message}`);
    }
  }

  // Validate Docker configuration
  validateDockerConfig() {
    this.log('INFO', 'Validating Docker configuration...');

    try {
      // Check Dockerfile
      const dockerfilePath = path.join(this.projectRoot, 'Dockerfile');
      const dockerfile = fs.readFileSync(dockerfilePath, 'utf8');

      if (dockerfile.includes('FROM node:')) {
        this.log('INFO', '✅ Dockerfile uses Node.js base image');
      } else {
        this.log('ERROR', 'Dockerfile does not use Node.js base image');
      }

      if (dockerfile.includes('EXPOSE')) {
        this.log('INFO', '✅ Dockerfile exposes port');
      } else {
        this.log('WARN', 'Dockerfile does not expose port');
      }

      // Check docker-compose.yml
      const composePath = path.join(this.projectRoot, 'docker-compose.yml');
      const composeContent = fs.readFileSync(composePath, 'utf8');

      if (composeContent.includes('postgres:')) {
        this.log('INFO', '✅ Docker Compose includes PostgreSQL');
      } else {
        this.log('ERROR', 'Docker Compose missing PostgreSQL service');
      }

      if (composeContent.includes('redis:')) {
        this.log('INFO', '✅ Docker Compose includes Redis');
      } else {
        this.log('ERROR', 'Docker Compose missing Redis service');
      }
    } catch (error) {
      this.log('ERROR', `Failed to validate Docker config: ${error.message}`);
    }
  }

  // Validate GitHub Actions workflows
  validateGitHubActions() {
    this.log('INFO', 'Validating GitHub Actions workflows...');

    const workflowsDir = path.join(this.projectRoot, '.github', 'workflows');

    if (!fs.existsSync(workflowsDir)) {
      this.log('ERROR', 'GitHub Actions workflows directory missing');
      return;
    }

    const requiredWorkflows = ['ci.yml', 'cd.yml'];

    requiredWorkflows.forEach(workflow => {
      const workflowPath = path.join(workflowsDir, workflow);
      if (fs.existsSync(workflowPath)) {
        this.log('INFO', `✅ Found workflow: ${workflow}`);

        try {
          const content = fs.readFileSync(workflowPath, 'utf8');
          if (content.includes('node-version')) {
            this.log('INFO', `✅ ${workflow} configures Node.js version`);
          } else {
            this.log(
              'WARN',
              `${workflow} missing Node.js version configuration`
            );
          }
        } catch (error) {
          this.log(
            'ERROR',
            `Failed to read workflow ${workflow}: ${error.message}`
          );
        }
      } else {
        this.log('ERROR', `Missing workflow: ${workflow}`);
      }
    });
  }

  // Check system dependencies
  async validateSystemDependencies() {
    this.log('INFO', 'Validating system dependencies...');

    const dependencies = [
      { name: 'node', command: 'node --version' },
      { name: 'npm', command: 'npm --version' },
      { name: 'git', command: 'git --version' },
      { name: 'docker', command: 'docker --version' },
    ];

    for (const dep of dependencies) {
      try {
        const { stdout } = await execAsync(dep.command);
        this.log('INFO', `✅ ${dep.name}: ${stdout.trim()}`);
      } catch (error) {
        this.log('WARN', `${dep.name} not available or not in PATH`);
      }
    }
  }

  // Validate security configuration
  validateSecurity() {
    this.log('INFO', 'Validating security configuration...');

    // Check for .env files in repository
    const envFiles = ['.env', '.env.local', '.env.production'];
    envFiles.forEach(file => {
      const filePath = path.join(this.projectRoot, file);
      if (fs.existsSync(filePath)) {
        this.log('ERROR', `Security risk: ${file} exists in repository`);
      }
    });

    // Check .gitignore
    const gitignorePath = path.join(this.projectRoot, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const gitignore = fs.readFileSync(gitignorePath, 'utf8');

      const requiredIgnores = ['.env', 'node_modules', '*.log'];
      requiredIgnores.forEach(pattern => {
        if (gitignore.includes(pattern)) {
          this.log('INFO', `✅ .gitignore includes: ${pattern}`);
        } else {
          this.log('WARN', `.gitignore missing pattern: ${pattern}`);
        }
      });
    } else {
      this.log('ERROR', '.gitignore file missing');
    }
  }

  // Validate Binary Lane configuration
  validateBinaryLaneConfiguration() {
    this.log('INFO', 'Validating Binary Lane configuration...');

    const requiredBinaryLaneVars = ['BINARYLANE_API_TOKEN', 'BASTION_HOST_IP'];

    const missing = requiredBinaryLaneVars.filter(
      varName => !process.env[varName]
    );

    if (missing.length > 0) {
      this.log('ERROR', 'Missing Binary Lane configuration:');
      missing.forEach(varName => {
        this.log('ERROR', `   - ${varName}`);
      });
      return false;
    }

    this.log('INFO', '✅ Binary Lane configuration validated');
    return true;
  }

  // Validate API endpoints
  validateApiEndpoints() {
    this.log('INFO', 'Validating API endpoints...');

    const endpoints = {
      binaryLane: 'https://api.binarylane.com.au/v2',
      github: 'https://api.github.com',
    };

    this.log('📡 API Endpoints:');
    Object.entries(endpoints).forEach(([service, url]) => {
      this.log('INFO', `   ${service}: ${url}`);
    });

    return true;
  }

  // Generate validation report
  generateReport() {
    console.info('\n' + '='.repeat(50));
    console.info('INFRASTRUCTURE VALIDATION REPORT');
    console.info('='.repeat(50));

    console.info(`\n📊 Summary:`);
    console.info(`   Errors: ${this.errors.length}`);
    console.info(`   Warnings: ${this.warnings.length}`);
    console.info(`   Info: ${this.info.length}`);

    if (this.errors.length > 0) {
      console.error('\n❌ Errors:');
      this.errors.forEach(error => console.info(`   - ${error}`));
    }

    if (this.warnings.length > 0) {
      console.warn('\n⚠️  Warnings:');
      this.warnings.forEach(warning => console.info(`   - ${warning}`));
    }

    if (this.errors.length === 0) {
      console.info('\n✅ Infrastructure validation passed!');
      console.info('\n🚀 Ready for deployment:');
      console.info('   npm run deploy:staging -- -ServerName "your-server"');
    } else {
      console.info('\n🔧 Please fix the errors above before deploying.');
      console.info('\n📚 Documentation:');
      console.info('   - GitHub Secrets: GITHUB_SECRETS_TEMPLATE.md');
      console.info('   - Environment Setup: README.md');
      console.info(
        '   - Server Setup: infrastructure/server/setup-linux-vm.md'
      );
    }

    console.info('\n' + '='.repeat(50));

    // Exit with error code if there are errors
    if (this.errors.length > 0) {
      process.exit(1);
    }
  }

  // Run all validations
  async validate() {
    console.info('🔍 Starting infrastructure validation...\n');

    this.validateRequiredFiles();
    this.validateEnvironmentVariables();
    this.validatePackageJson();
    this.validateDockerConfig();
    this.validateGitHubActions();
    this.validateSecurity();
    await this.validateSystemDependencies();
    this.validateBinaryLaneConfiguration();
    this.validateApiEndpoints();

    this.generateReport();
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new InfrastructureValidator();
  validator.validate().catch(error => {
    console.error('Validation failed:', error);
    process.exit(1);
  });
}

module.exports = InfrastructureValidator;
