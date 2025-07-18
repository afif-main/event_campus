require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'axel',
    database: process.env.DB_NAME || 'campus_events_dev',
    host: process.env.DB_HOST || '127.0.0.1',
    dialect: 'postgres',
    logging: console.log
  },
  test: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'axel',
    database: process.env.DB_NAME || 'campus_events_test',
    host: process.env.DB_HOST || '127.0.0.1',
    dialect: 'postgres',
    logging: false
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
}; 