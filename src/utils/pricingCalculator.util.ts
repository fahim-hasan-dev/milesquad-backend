import { IFareSetting } from "../app/modules/setting/setting.interface";

export type IPricingInput = {
    dimension?: { height?: number; width?: number; length?: number };
    totalWeight?: number;
    distanceKm: number;
    durationText: string;
    itemValue: number;
    fareSetting?: IFareSetting;
    isScheduled?: boolean;
    scheduleIndex?: number;
};

export type IPricingOutput = {
    volume: number;
    volumeUtilization: number;
    weightUtilization: number;
    effectiveUtilization: number;
    loadFactor: number;
    fuelCost: number;
    timeCost: number;
    goodRisks: number;
    subtotalFee: number;
    platformFee: number;
    operationFee: number;
    totalDeliveryFee: number;
    driverShare: number;
    platformCommission: number;
    baseFare: number;
};

const parseDurationToMinutes = (durationText: string): number => {
    if (!durationText) return 0;
    let totalMinutes = 0;
    const hoursMatch = durationText.match(/(\d+)\s*hour/i);
    const minsMatch = durationText.match(/(\d+)\s*min/i);

    if (hoursMatch) {
        totalMinutes += parseInt(hoursMatch[1], 10) * 60;
    }
    if (minsMatch) {
        totalMinutes += parseInt(minsMatch[1], 10);
    }
    if (!hoursMatch && !minsMatch) {
        const num = parseFloat(durationText);
        if (!isNaN(num)) totalMinutes = num;
    }

    return totalMinutes;
};

export const calculateParcelPricing = (input: IPricingInput): IPricingOutput => {
    const {
        dimension = {},
        totalWeight = 0,
        distanceKm,
        durationText,
        itemValue = 0,
        fareSetting,
        isScheduled = false,
        scheduleIndex = 0,
    } = input;

    const baseFee = fareSetting?.baseFee ?? 0;
    const freeTime = fareSetting?.freeTime ?? 0;
    const timeRate = fareSetting?.timeRate ?? 0;
    const fuelRate = fareSetting?.fuelRate ?? 0;

    const toFraction = (val?: number) => {
        if (!val) return 0;
        return val > 1 ? val / 100 : val;
    };

    const marginPercent = toFraction(fareSetting?.margin);
    const overheadPercent = toFraction(fareSetting?.overhead);
    const loadFactorIndex = toFraction(fareSetting?.loadFactor);
    const scheduledDeliveryPercent = toFraction(fareSetting?.scheduledDelivery);
    const maxWeight = fareSetting?.maxWeight ?? 0;
    const maxVolume = fareSetting?.maxVolume ?? 0;

    // 1. Volume of goods (m^3) = L x W x H (in cm) * 1e-6
    const lengthCm = dimension.length ?? 0;
    const widthCm = dimension.width ?? 0;
    const heightCm = dimension.height ?? 0;
    const volume = Number((lengthCm * widthCm * heightCm * 1e-6).toFixed(6));

    // 2. Volume utilization (%) = Volume of goods / Vehicle max volume
    const volumeUtilization = maxVolume > 0 ? volume / maxVolume : 0;

    // 3. Weight utilization (%) = Weight of goods / Vehicle max capacity
    const weightUtilization = maxWeight > 0 ? totalWeight / maxWeight : 0;

    // 4. Effective utilization (%) = Max(Volume utilization, Weight utilization)
    const effectiveUtilization = Math.max(volumeUtilization, weightUtilization);

    // 5. Load factor = 1 + (Effective utilization x load factor index)
    const loadFactor = Number((1 + (effectiveUtilization * loadFactorIndex)).toFixed(4));

    // 6. Fuel cost = Fuel rate x Load factor x distance
    const fuelCost = Number((fuelRate * loadFactor * distanceKm).toFixed(2));

    // 7. Time cost = Time rate x Max(0, duration - Free time)
    const durationMinutes = parseDurationToMinutes(durationText);
    const billableTime = Math.max(0, durationMinutes - freeTime);
    const timeCost = Number((timeRate * billableTime).toFixed(2));

    // 8. Good risks = Risk index % x good value
    let riskIndexPercent = 0;
    if (itemValue < 100000) {
        riskIndexPercent = fareSetting?.riskIndex1 ?? 0;
    } else if (itemValue <= 250000) {
        riskIndexPercent = fareSetting?.riskIndex2 ?? 0;
    } else {
        riskIndexPercent = fareSetting?.riskIndex3 ?? 0;
    }
    const goodRisks = Number(((riskIndexPercent / 100) * itemValue).toFixed(2));

    // 9. Subtotal fee = Base fee + Time cost + Fuel cost + Good risks
    const subtotalFee = Number((baseFee + timeCost + fuelCost + goodRisks).toFixed(2));

    // 10. Platform fee & Operation fee & Rider total cost
    const platformFee = Number((subtotalFee * marginPercent).toFixed(2));
    const driverShare = Number((subtotalFee * (1 - marginPercent)).toFixed(2));
    const operationFee = Number((subtotalFee * overheadPercent).toFixed(2));

    // 11. Customer total cost
    let totalDeliveryFee = subtotalFee + platformFee;
    if (isScheduled) {
        const scheduledBonus = scheduledDeliveryPercent > 0 ? scheduledDeliveryPercent : (scheduleIndex > 0 ? scheduleIndex : 0.1);
        totalDeliveryFee = (subtotalFee + platformFee + operationFee) * (1 + scheduledBonus);
    }
    totalDeliveryFee = Math.ceil(totalDeliveryFee);

    const platformCommission = Number((totalDeliveryFee - driverShare).toFixed(2));

    return {
        volume,
        volumeUtilization: Number((volumeUtilization * 100).toFixed(2)),
        weightUtilization: Number((weightUtilization * 100).toFixed(2)),
        effectiveUtilization: Number((effectiveUtilization * 100).toFixed(2)),
        loadFactor,
        fuelCost,
        timeCost,
        goodRisks,
        subtotalFee,
        platformFee,
        operationFee,
        totalDeliveryFee,
        driverShare,
        platformCommission,
        baseFare: baseFee,
    };
};
