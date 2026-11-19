"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // On a brand-new database, sequelize.sync() at startup may already have
    // created expenses with the note column from the model, so only add it
    // when it's missing.
    const columns = await queryInterface.describeTable("expenses");
    if (columns.note) return;

    await queryInterface.addColumn("expenses", "note", {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    const columns = await queryInterface.describeTable("expenses");
    if (!columns.note) return;

    await queryInterface.removeColumn("expenses", "note");
  },
};
