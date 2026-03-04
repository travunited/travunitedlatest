const formData = {
    companyName: 'ABC PVT LIMITED',
    contactPerson: 'SHRI',
    email: 'travunited06@gmail.com',
    phone: '9845864152',
    message: 'AGAGAFGAFG',
    gstNumber: '29AAICTB376R1Z1'
};

async function test() {
    const res = await fetch('http://localhost:3000/api/corporate/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
    });
    const text = await res.text();
    console.log(res.status, text);
}

test();
