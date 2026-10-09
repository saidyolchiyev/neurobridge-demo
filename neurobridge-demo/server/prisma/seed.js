import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const points={"Bakı":[40.4093,49.8671],"Sumqayıt":[40.5855,49.6317],"Şamaxı":[40.6314,48.6414],"Qəbələ":[40.9814,47.8458],"Şəki":[41.1919,47.1706],"Gəncə":[40.6828,46.3606]};
const routes=[
  ["elvin@yolyoldas.demo","Elvin Məmmədov","Hyundai Elantra","Bakı","Qəbələ","14:30",3,15],
  ["rashad@yolyoldas.demo","Rəşad Əliyev","Toyota Prius","Bakı","Şamaxı","15:00",2,10],
  ["aysel@yolyoldas.demo","Aysel Həsənova","Kia Sportage","Bakı","Şəki","16:00",3,20],
  ["murad@yolyoldas.demo","Murad Quliyev","Mercedes Vito","Sumqayıt","Bakı","13:45",6,5],
  ["nihat@yolyoldas.demo","Nihat İsmayılov","Toyota Corolla","Gəncə","Bakı","17:30",3,18],
  ["kamran@yolyoldas.demo","Kamran Abbasov","Skoda Superb","Bakı","Gəncə","09:00",2,16],
];
try{
 const passwordHash=await bcrypt.hash("demo1234",12);
 const passenger=await prisma.user.upsert({where:{email:"sernisin@yolyoldas.demo"},update:{},create:{name:"Demo Sərnişin",email:"sernisin@yolyoldas.demo",phone:"+994500000001",passwordHash,role:"PASSENGER"}});
 let firstRide;
 for(const [email,name,model,origin,destination,time,seats,price] of routes){
  const driver=await prisma.user.upsert({where:{email},update:{},create:{name,email,phone:"+994500000002",passwordHash,role:"DRIVER"}});
  const vehicle=await prisma.vehicle.upsert({where:{driverId:driver.id},update:{model},create:{driverId:driver.id,model,type:"Sedan",capacity:seats+1}});
  const departureTime=new Date();departureTime.setDate(departureTime.getDate()+1);const [hour,minute]=time.split(":");departureTime.setHours(Number(hour),Number(minute),0,0);
  const prior=await prisma.ride.findFirst({where:{driverId:driver.id,originName:origin,destinationName:destination,status:"ACTIVE"}});
  const ride=prior?await prisma.ride.update({where:{id:prior.id},data:{departureTime,availableSeats:seats,price,vehicleId:vehicle.id}}):await prisma.ride.create({data:{driverId:driver.id,vehicleId:vehicle.id,originName:origin,destinationName:destination,originLatitude:points[origin][0],originLongitude:points[origin][1],destinationLatitude:points[destination][0],destinationLongitude:points[destination][1],departureTime,availableSeats:seats,price}});
  if(origin==="Bakı"&&destination==="Qəbələ")firstRide=ride;
 }
 if(firstRide){const existing=await prisma.booking.findFirst({where:{rideId:firstRide.id,passengerId:passenger.id}});if(!existing)await prisma.booking.create({data:{rideId:firstRide.id,passengerId:passenger.id}})}
 console.log("Demo səfərlər və hesablar hazırdır.");
}finally{await prisma.$disconnect()}
