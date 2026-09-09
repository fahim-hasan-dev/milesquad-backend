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

            const rawFs = (settings.fareSettings as any) || {};
            const hasLegacyKeys = Boolean(rawFs.truck || rawFs["small cargo"] || rawFs.smallCargo);

            if (hasLegacyKeys) {
                const fallbackFare = rawFs.small_cargo || rawFs["small cargo"] || rawFs.smallCargo || rawFs.truck;
                const updatedSmallCargo = (fallbackFare && (fallbackFare.maxWeight > 0 || fallbackFare.baseFee > 0))
                    ? fallbackFare
                    : (rawFs.truck || rawFs.small_cargo || {});

                settings = await Setting.findOneAndUpdate(
                    {},
                    {
                        $set: { "fareSettings.small_cargo": updatedSmallCargo },
                        $unset: {
                            "fareSettings.truck": "",
                            "fareSettings.small cargo": "",
                            "fareSettings.smallCargo": ""
                        }
                    },
                    { new: true }
                );
            }

            // Ensure clean lean output without legacy fields
            if (settings) {
                const settingsObj = settings.toObject ? settings.toObject() : settings;
                if (settingsObj.fareSettings) {
                    delete (settingsObj.fareSettings as any).truck;
                    delete (settingsObj.fareSettings as any)["small cargo"];
                    delete (settingsObj.fareSettings as any).smallCargo;
                }
                return settingsObj as ISetting;
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
        settings = await Setting.findOneAndUpdate({}, {
            $set: payload,
            $unset: {
                "fareSettings.truck": "",
                "fareSettings.small cargo": "",
                "fareSettings.smallCargo": ""
            }
        }, {
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

