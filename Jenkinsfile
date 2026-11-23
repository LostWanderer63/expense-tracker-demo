// CI/CD pipeline for the Expense Tracker.
// CI: install + syntax check + frontend build in the Jenkins workspace.
// CD: on main, deploy to this EC2 server via scripts/deploy.sh (runs as ec2-user).
pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '15'))
    timeout(time: 20, unit: 'MINUTES')
  }

  triggers {
    // Fallback if the GitHub webhook isn't set up: check for new commits every 2 minutes.
    pollSCM('H/2 * * * *')
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
        sh 'git log -1 --format="Building %h: %s (%an)"'
      }
    }

    stage('Install') {
      steps {
        sh 'node -v && npm -v'
        sh 'npm ci --no-audit --no-fund'
      }
    }

    stage('Check') {
      steps {
        sh 'npm run check'
      }
    }

    stage('Build') {
      steps {
        sh 'npm run build'
      }
    }

    stage('Deploy') {
      when {
        anyOf {
          branch 'main'
          expression { env.GIT_BRANCH in ['origin/main', 'main'] }
        }
      }
      steps {
        sh 'sudo -n -u ec2-user /home/ec2-user/expense-tracker/scripts/deploy.sh'
      }
    }
  }

  post {
    success { echo 'Pipeline succeeded.' }
    failure { echo 'Pipeline failed. Check the stage logs above.' }
  }
}
