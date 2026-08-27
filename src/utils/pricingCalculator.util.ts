import { IFareSetting } from "../app/modules/setting/setting.interface";

export type IPricingInput = {
    dimension?: { height?: number; width?: number; length?: number };
    totalWeight?: number;
    distanceKm: number;
    durationText: string;
    itemValue: number;
    fareSetting?: IFareSetting;
    isScheduled?: boolean;
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
    baseFee: number;
    totalPrice: number;
    additionalCost: number;
    totalRun: number;
    overhead: number;
    milesquadInsurance: number;
    totalOfRun: number;
    serviceFee: number;
    totalToPay: number;
    marginMilesquad: number;

    // Compatibility aliases
    totalDeliveryFee: number;
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
    const maxWeight = fareSetting?.maxWeight ?? 0;
    const maxVolume = fareSetting?.maxVolume ?? 0;

    // 1. Volume of the goods (m^3) = L x W x H (in cm for Senegal) * 1x10-6
    const lengthCm = dimension.length ?? 0;
    const widthCm = dimension.width ?? 0;
    const heightCm = dimension.height ?? 0;
    const volume = Number((lengthCm * widthCm * heightCm * 1e-6).toFixed(6));

    // 2. Volume utilization (%) = Volume of the goods / Vehicle maximum volume
    const volumeUtilization = maxVolume > 0 ? volume / maxVolume : 0;

    // 3. Weight utilization (%) = Weight of goods / Vehicle maximum capacity
    const weightUtilization = maxWeight > 0 ? totalWeight / maxWeight : 0;

    // 4. Effective utilization (%) = Max (Volume utilization, Weight utilization)
    const effectiveUtilization = Math.max(volumeUtilization, weightUtilization);

    // 5. Load factor = 1 + (Effective Utilization x load factor index)
    const loadFactor = Number((1 + (effectiveUtilization * loadFactorIndex)).toFixed(4));

    // 6. Fuel cost = Fuel rate x Load factor x distance
    const fuelCost = Number((fuelRate * loadFactor * distanceKm).toFixed(2));

    // 7. Time cost = Time rate x (duration – Free time)
    const durationMinutes = parseDurationToMinutes(durationText);
    const billableTime = Math.max(0, durationMinutes - freeTime);
    const timeCost = Number((timeRate * billableTime).toFixed(2));

    // 8. Good risks = Risk index x itemValue
    let riskIndexPercent = 0;
    if (itemValue < 100000) {
        riskIndexPercent = fareSetting?.riskIndex1 ?? 0;
    } else if (itemValue <= 250000) {
        riskIndexPercent = fareSetting?.riskIndex2 ?? 0;
    } else {
        riskIndexPercent = fareSetting?.riskIndex3 ?? 0;
    }
    const goodRisks = Number(((riskIndexPercent / 100) * itemValue).toFixed(2));

    // 9. Total price = Base fee + Time cost + Fuel cost (Driver app)
    const totalPrice = Number((baseFee + timeCost + fuelCost).toFixed(2));

    // 10. Additional cost = good risks / 2 (Driver app)
    const additionalCost = Number((goodRisks / 2).toFixed(2));

    // 11. Total run: Total price + Additional cost (Driver app)
    const totalRun = Number((totalPrice + additionalCost).toFixed(2));

    // 12. Overhead (Milesquad) = Total price x Overhead (%) (Admin panel)
    const overhead = Number((totalPrice * overheadPercent).toFixed(2));

    // 13. Milesquad insurance: good risk / 2 (Admin panel)
    const milesquadInsurance = Number((goodRisks / 2).toFixed(2));

    // 14. Total of the run: (Total price + Overhead) (Customer app)
    const totalOfRun = Number((totalPrice + overhead).toFixed(2));

    // 15. Service fee: (Total price + Overhead) / (1 - Margin) (Customer app)
    const denominator = marginPercent < 1 ? (1 - marginPercent) : 1;
    const serviceFee = Number(((totalPrice + overhead) / denominator).toFixed(2));

    // 16. Total to pay: (Total price + Overhead) / (1 - Margin) + (good risks) (Customer app)
    const totalToPay = Math.ceil(serviceFee + goodRisks);

    // 17. Margin Milesquad: Total to pay – Overhead – Milesquad insurance (Admin panel profit)
    const marginMilesquad = Number((totalToPay - overhead - milesquadInsurance - totalRun).toFixed(2));

    return {
        volume,
        volumeUtilization: Number((volumeUtilization * 100).toFixed(2)),
        weightUtilization: Number((weightUtilization * 100).toFixed(2)),
        effectiveUtilization: Number((effectiveUtilization * 100).toFixed(2)),
        loadFactor,
        fuelCost,
        timeCost,
        goodRisks,
        baseFee,
        totalPrice,
        additionalCost,
        totalRun,
        overhead,
        milesquadInsurance,
        totalOfRun,
        serviceFee,
        totalToPay,
        marginMilesquad,

        // Aliases for compatibility
        totalDeliveryFee: totalToPay,
    };
};
