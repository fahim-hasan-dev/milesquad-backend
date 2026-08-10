import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import QueryBuilder from '../../builder/QueryBuilder';
import { Vehicle } from './vehicle.model';
import { IVehicle } from './vehicle.interface';
import { User } from '../user/user.model';
import { USER_ROLES } from '../../../enum/user';

const createVehicle = async (payload: IVehicle) => {
    const isExist = await Vehicle.findOne({ licensePlate: payload.licensePlate });
    if (isExist) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'A vehicle with this license plate already exists.');
    }

    const result = await Vehicle.create(payload);
    return result;
};

const getAllVehicles = async (query: Record<string, unknown>) => {
    const vehicleQueryBuilder = new QueryBuilder(Vehicle.find().populate('assignedUser', 'fullName email phone image'), query)
        .filter()
        .sort()
        .fields()
        .paginate();

    vehicleQueryBuilder.modelQuery.select("name licensePlate type assignedUser createdAt").lean();

    const vehicles = await vehicleQueryBuilder.modelQuery;
    const paginationInfo = await vehicleQueryBuilder.getPaginationInfo();

    return {
        vehicles,
        meta: paginationInfo,
    };
};

const getSingleVehicle = async (id: string) => {
    const result = await Vehicle.findById(id).populate('assignedUser', 'fullName email phone image');
    if (!result) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Vehicle not found');
    }
    return result;
};

const updateVehicle = async (id: string, payload: Partial<IVehicle>) => {
    const isExist = await Vehicle.findById(id);
    if (!isExist) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Vehicle not found');
    }

    if (payload.licensePlate) {
        const isLicensePlateExist = await Vehicle.findOne({ licensePlate: payload.licensePlate, _id: { $ne: id } });
        if (isLicensePlateExist) {
            throw new ApiError(StatusCodes.BAD_REQUEST, 'A vehicle with this license plate already exists.');
        }
    }

    const result = await Vehicle.findByIdAndUpdate(id, payload, { new: true });
    return result;
};

const deleteVehicle = async (id: string) => {
    const isExist = await Vehicle.findById(id);
    if (!isExist) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Vehicle not found');
    }

    if (isExist.assignedUser) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Cannot delete vehicle because a driver is currently assigned. Remove the driver first.');
    }

    const result = await Vehicle.findByIdAndDelete(id);
    return result;
};

const assignDriver = async (payload: { vehicleId: string; driverId: string }) => {
    const { vehicleId, driverId } = payload;
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Vehicle not found');
    }

    if (vehicle.assignedUser && vehicle.assignedUser.toString() !== driverId) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Another driver is already assigned to this vehicle.');
    }

    const driver = await User.findById(driverId);
    if (!driver || driver.role !== USER_ROLES.DRIVER) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid driver ID.');
    }

    const isDriverAssignedToAnother = await Vehicle.findOne({ assignedUser: driverId, _id: { $ne: vehicleId } });
    if (isDriverAssignedToAnother) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'This driver is already assigned to another vehicle.');
    }

    const result = await Vehicle.findByIdAndUpdate(
        vehicleId,
        { $set: { assignedUser: driverId } },
        { new: true }
    ).populate('assignedUser', 'fullName email phone image');

    await User.findByIdAndUpdate(
        driverId,
        { $set: { 'driverInfo.assignedVehicle': vehicleId } },
        { new: true }
    );

    return result;
};

const removeDriver = async (payload: { vehicleId: string; driverId: string }) => {
    const { vehicleId, driverId } = payload;

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Vehicle not found');
    }

    const result = await Vehicle.findByIdAndUpdate(
        vehicleId,
        { $set: { assignedUser: null } },
        { new: true }
    );

    await User.findByIdAndUpdate(
        driverId,
        { $set: { 'driverInfo.assignedVehicle': null } },
        { new: true }
    );

    return result;
};

export const VehicleServices = {
    createVehicle,
    getAllVehicles,
    getSingleVehicle,
    updateVehicle,
    deleteVehicle,
    assignDriver,
    removeDriver,
};
