const { z } = require('zod');

const leadSchema = z.object({
    companyName: z.string().min(2),
    contactPerson: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(6),
    message: z.string().min(10),
    gstNumber: z.string().optional().or(z.literal("")),
});

console.log(leadSchema.safeParse({
    companyName: 'ABC PVT LIMITED',
    contactPerson: 'SHRI',
    email: 'travunited06@gmail.com',
    phone: '9845864152',
    message: 'AGAGAFGAFG',
    gstNumber: '29AAICTB376R1Z1'
}));
