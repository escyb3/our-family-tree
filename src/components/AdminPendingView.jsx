import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminPendingView() {
  const [pending, setPending] = useState([]);

  useEffect(() => {
    fetch("/pending-people")
      .then((res) => res.json())
      .then(setPending);
  }, []);

  const approve = async (person) => {
    const side = prompt("לאיזה צד להוסיף את האדם הזה? (ben_abou / elharrar / ...)" );
    if (!side) return;

    await fetch("/approve-person", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: person.id, side })
    });

    setPending(pending.filter(p => p.id !== person.id));
  };

  if (!pending.length) return <p className="text-center">אין בקשות ממתינות</p>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <h2 className="text-2xl font-bold mb-4">בקשות ממתינות</h2>
      {pending.map((p) => (
        <Card key={p.id} className="bg-gray-100 dark:bg-gray-800">
          <CardContent className="p-4">
            <p><strong>שם:</strong> {p.name}</p>
            {p.birthDate && <p><strong>תאריך לידה:</strong> {p.birthDate}</p>}
            {p.birthPlace && <p><strong>מקום לידה:</strong> {p.birthPlace}</p>}
            <p><strong>נשלח ע"י:</strong> {p.submittedBy}</p>
            <Button className="mt-2" onClick={() => approve(p)}>אשר והוסף</Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
