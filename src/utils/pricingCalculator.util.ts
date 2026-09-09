import { IFareSetting } from "../app/modules/setting/setting.interface";

export type IPricingInput = {
    dimension?: { height?: number; width?: number; length?: number };
    totalWeight?: number;
    numberOfGoods?: number;
    vehicleType?: string;
    distanceKm: number;
    dropDuration: number;
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
    baseFee: number;
    fuelCost: number;
    timeCost: number;
    goodInsurance: number;
    directCost: number;
    overheadCost: number;
    operationCost: number;
    serviceFee: number;
    milesquadMargin: number;
    deliveryFee: number;
    totalOfRun: number;
};

export const calculateParcelPricing = (input: IPricingInput): IPricingOutput => {
    const {
        dimension = {},
        totalWeight = 0,
        numberOfGoods,
        vehicleType,
        distanceKm = 0,
        dropDuration = 0,
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

    const isMotorcycle = vehicleType?.toLowerCase().replace(/\s+/g, '_') === 'motorcycle';

    // 1. Total volume of the goods (m^3) = (L x W x H (in cm) * 1e-6) x number of items (Volume is 0 for motorcycle)
    const lengthCm = isMotorcycle ? 0 : (dimension.length ?? 0);
    const widthCm = isMotorcycle ? 0 : (dimension.width ?? 0);
    const heightCm = isMotorcycle ? 0 : (dimension.height ?? 0);
    const itemsCount = numberOfGoods && numberOfGoods > 0 ? numberOfGoods : 1;
    const volume = isMotorcycle ? 0 : Number((lengthCm * widthCm * heightCm * 1e-6 * itemsCount).toFixed(6));

    // 2. Volume utilization (%) = Total volume of the goods / Vehicle maximum volume (0 for motorcycle)
    const volumeUtilization = (!isMotorcycle && maxVolume > 0) ? volume / maxVolume : 0;

    // 3. Weight utilization (%) = Weight of goods / Vehicle maximum capacity
    const weightUtilization = maxWeight > 0 ? totalWeight / maxWeight : 0;

    // 4. Effective utilization (%) = Max (total Volume utilization, Weight utilization)
    const effectiveUtilization = Math.max(volumeUtilization, weightUtilization);

    // 5. Load factor = 1 + (Effective Utilization x load factor index)
    const loadFactor = Number((1 + (effectiveUtilization * loadFactorIndex)).toFixed(4));

    // 6. Fuel cost = Fuel rate x Load factor x distance (input from Google map API)
    const fuelCost = Number((fuelRate * loadFactor * distanceKm).toFixed(2));

    // 7. Time cost = Time rate x (duration (input from Google map API) - Free time)
    // Disclaimer: if Duration < Free time = 0
    const billableTime = Math.max(0, dropDuration - freeTime);
    const timeCost = Number((timeRate * billableTime).toFixed(2));

    // 8. Good insurance = Risk index x good value (from customer app input)
    let riskIndexPercent = 0;
    if (itemValue < 100000) {
        riskIndexPercent = fareSetting?.riskIndex1 ?? 0;
    } else if (itemValue <= 250000) {
        riskIndexPercent = fareSetting?.riskIndex2 ?? 0;
    } else {
        riskIndexPercent = fareSetting?.riskIndex3 ?? 0;
    }
    const goodInsurance = Number((toFraction(riskIndexPercent) * itemValue).toFixed(2));

    // 9. Direct cost = Base fee + Time cost + Fuel cost (Driver app)
    const directCost = Number((baseFee + timeCost + fuelCost).toFixed(2));

    // 10. OverHead cost = Direct cost * overhead% (Admin panel)
    const overheadCost = Number((directCost * overheadPercent).toFixed(2));

    // 11. Operation cost = Direct cost + OverHead cost
    const operationCost = Number((directCost + overheadCost).toFixed(2));

    // 12. Service fee = (Operation cost / (1 - Margin %)) - Operation cost
    const marginDenominator = marginPercent < 1 ? (1 - marginPercent) : 1;
    const serviceFee = Number(((operationCost / marginDenominator) - operationCost).toFixed(2));

    // 13. Delivery fee = Operation cost + Service fee + Good insurance (Customer app)
    const deliveryFee = Number((operationCost + serviceFee + goodInsurance).toFixed(2));

    // 14. Total of run = Direct cost (Driver app)
    const totalOfRun = directCost;

    return {
        volume,
        volumeUtilization: Number((volumeUtilization * 100).toFixed(2)),
        weightUtilization: Number((weightUtilization * 100).toFixed(2)),
        effectiveUtilization: Number((effectiveUtilization * 100).toFixed(2)),
        loadFactor,
        baseFee,
        fuelCost,
        timeCost,
        goodInsurance,
        directCost,
        overheadCost,
        operationCost,
        serviceFee,
        milesquadMargin: serviceFee,
        deliveryFee,
        totalOfRun,
    };
};
