const { Op } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Update all existing staff roles to organizer
    await queryInterface.sequelize.query(
      `UPDATE users SET role = 'organizer' WHERE role = 'staff'`
    );
  },

  down: async (queryInterface, Sequelize) => {
    // Rollback - update all organizer roles back to staff
    await queryInterface.sequelize.query(
      `UPDATE users SET role = 'staff' WHERE role = 'organizer'`
    );
  }
};
