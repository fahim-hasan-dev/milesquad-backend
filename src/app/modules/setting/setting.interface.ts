export type IFareSetting = {
    baseFee: number;
    freeTime: number;
    timeRate: number;
    fuelRate: number;
    margin: number;
    overhead: number;
    riskIndex1: number;
    riskIndex2: number;
    riskIndex3: number;
    loadFactor: number;
    scheduledDelivery: number;
    maxWeight: number;
    maxVolume: number;
};

export type ISetting = {
    fareSettings: {
        motorcycle: IFareSetting;
        tricycle: IFareSetting;
        car: IFareSetting;
        van: IFareSetting;
        small_cargo: IFareSetting;
    };
};
