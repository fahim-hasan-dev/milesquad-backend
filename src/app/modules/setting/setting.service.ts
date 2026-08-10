import { ISetting } from "./setting.interface";
import { Setting } from "./setting.model";

const getSettings = async (): Promise<ISetting | null> => {
    let settings = await Setting.findOne();
    if (!settings) {
        settings = await Setting.create({});
    }
    return settings;
};

const updateSettings = async (payload: Partial<ISetting>): Promise<ISetting | null> => {
    let settings = await Setting.findOne();

    if (!settings) {
        settings = await Setting.create(payload);
    } else {
        settings = await Setting.findOneAndUpdate({}, payload, {
            new: true,
            runValidators: true,
        });
    }

    return settings;
};

export const SettingServices = {
    getSettings,
    updateSettings,
};
