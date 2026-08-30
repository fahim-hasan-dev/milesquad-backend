import { cacheDel, getOrSetCache } from "../../../helpers/cacheHelper";
import { ISetting } from "./setting.interface";
import { Setting } from "./setting.model";

const CACHE_KEY_SETTINGS = "cache:system_settings";
const SETTINGS_TTL = 86400; // 24 hours

const getSettings = async (): Promise<ISetting | null> => {
    return getOrSetCache(
        CACHE_KEY_SETTINGS,
        async () => {
            let settings = await Setting.findOne();
            if (!settings) {
                settings = await Setting.create({});
            }
            return settings;
        },
        SETTINGS_TTL
    );
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

    // Invalidate system settings cache
    await cacheDel(CACHE_KEY_SETTINGS);

    return settings;
};

export const SettingServices = {
    getSettings,
    updateSettings,
};

