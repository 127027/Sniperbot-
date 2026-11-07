// Score is an uncalibrated rating, never a probability. Amount includes entry costs.
export function allocatePaper({score,min,max,free,capacity=Infinity}){
 if(![score,min,max,free].every(Number.isFinite)||score<80||score>100||min<=0||max<min||free<0||!(capacity>0))return 0;
 const target=min+(max-min)*Math.min(1,(score-80)/12);
 const amount=Math.floor((Math.min(target,free,capacity)+1e-9)*100)/100;
 return amount>=min?amount:0;
}
