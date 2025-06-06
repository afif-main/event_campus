const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Registration extends Model {
    static associate(models) {
      Registration.belongsTo(models.User, {
        foreignKey: 'userId'
      });
      Registration.belongsTo(models.Event, {
        foreignKey: 'eventId'
      });
    }
  }

  Registration.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    eventId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Events',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'waitlisted', 'cancelled'),
      defaultValue: 'pending'
    },
    registrationDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'Registration',
    indexes: [
      {
        unique: true,
        fields: ['userId', 'eventId']
      }
    ]
  });

  return Registration;
}; 