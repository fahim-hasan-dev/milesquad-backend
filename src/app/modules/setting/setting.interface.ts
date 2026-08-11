export type IFareSetting = {
    baseFee: number;
    freeTime: number;
    timeRate: number;
    fuelRate: number;
    maxWeight: number;
    maxVolume: number;
    loadFactor: number;
    commission: {
        platformMargin: number;
        ridersMargin: number;
    };
    riskIndex: {
        riskIndex1: number;
        riskIndex2: number;
        riskIndex3: number;
    };
};

export type ISetting = {
    fareSettings: {
        motorcycle: IFareSetting;
        tricycle: IFareSetting;
        car: IFareSetting;
        van: IFareSetting;
        truck: IFareSetting;
    };
    vehicleBaseFares?: {
        motorcycle?: number;
        tricycle?: number;
        car?: number;
        van?: number;
        truck?: number;
    };
    perKiloCost?: number;
    platformCommissionPercentage?: number;
};
