const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Note = sequelize.define(
  "Note",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "user_id",
    },
    noteDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "note_date",
    },
    text: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
  },
  {
    tableName: "notes",
    timestamps: true,
    indexes: [{ fields: ["user_id", "note_date"] }],
  }
);

module.exports = Note;
