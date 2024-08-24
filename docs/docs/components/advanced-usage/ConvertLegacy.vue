<script setup lang="ts">
class Chair {
    // Defaults that will be common for all the instances
    static backSupport: boolean = true;
    static armRests: boolean = true;

    // Instance properties
    color: string;
    seatHeight: number;
    recliningAngle: number;
    headSupport: boolean;
    padding: string;
    seatSize: string;
    isHeightAdjustable: boolean;
    isMovable: boolean;
    type: string;

    constructor(
        color: string,
        seatHeight: number,
        recliningAngle: number,
        headSupport: boolean,
        padding: string,
        seatSize: string,
        isHeightAdjustable: boolean,
        isMovable: boolean
    ) {
        // Defaults which can be changed by the subclass class.
        this.color = color;
        this.seatHeight = seatHeight;
        this.recliningAngle = recliningAngle;
        this.headSupport = headSupport || false;
        this.padding = padding || "3 inch";
        this.seatSize = seatSize || "16 inch";
        this.isHeightAdjustable = isHeightAdjustable || false;
        this.isMovable = isMovable || false;
        this.type = "Chair";
        console.log(Chair.printDefaultProps()); // Usage of static method inside constructor
    } 

    static logObjectProps(): void {
        console.dir(this);
    }

    // Static within static usage
    static printDefaultProps(): void {
        console.log(`Chair Back Support = ${this.backSupport}`);
        console.log(`Arm rests support = ${this.armRests}`);
    }

    adjustableHeight(): void {};
    adjustAngle(): void {};
    moveChair(): void {};    
}
</script>
<template>
  <div>Hello</div>
</template>