import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function AddPersonForm({ onSubmit }) {
  const [form, setForm] = useState({
    name: "",
    gender: "",
    birthDate: "",
    birthPlace: "",
    deathDate: "",
    deathPlace: "",
    spouse: "",
    children: "",
    parents: "",
    notes: ""
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
    setForm({
      name: "",
      gender: "",
      birthDate: "",
      birthPlace: "",
      deathDate: "",
      deathPlace: "",
      spouse: "",
      children: "",
      parents: "",
      notes: ""
    });
  };

  return (
    <Card className="max-w-2xl mx-auto p-6 shadow-xl rounded-2xl bg-white dark:bg-gray-900">
      <h2 className="text-xl font-bold mb-4">הוספת בן/בת משפחה חדש/ה</h2>
      <Separator className="mb-4" />
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">שם מלא</Label>
          <Input name="name" value={form.name} onChange={handleChange} required />
        </div>

        <div>
          <Label htmlFor="gender">מגדר</Label>
          <Input name="gender" value={form.gender} onChange={handleChange} placeholder="M או F" />
        </div>

        <div>
          <Label htmlFor="birthDate">תאריך לידה</Label>
          <Input name="birthDate" type="date" value={form.birthDate} onChange={handleChange} />
        </div>

        <div>
          <Label htmlFor="birthPlace">מקום לידה</Label>
          <Input name="birthPlace" value={form.birthPlace} onChange={handleChange} />
        </div>

        <div>
          <Label htmlFor="deathDate">תאריך פטירה</Label>
          <Input name="deathDate" type="date" value={form.deathDate} onChange={handleChange} />
        </div>

        <div>
          <Label htmlFor="deathPlace">מקום פטירה</Label>
          <Input name="deathPlace" value={form.deathPlace} onChange={handleChange} />
        </div>

        <div>
          <Label htmlFor="spouse">שם בן/בת זוג</Label>
          <Input name="spouse" value={form.spouse} onChange={handleChange} />
        </div>

        <div>
          <Label htmlFor="children">שמות ילדים (מופרדים בפסיקים)</Label>
          <Input name="children" value={form.children} onChange={handleChange} />
        </div>

        <div>
          <Label htmlFor="parents">שמות הורים (מופרדים בפסיקים)</Label>
          <Input name="parents" value={form.parents} onChange={handleChange} />
        </div>

        <div>
          <Label htmlFor="notes">הערות</Label>
          <Input name="notes" value={form.notes} onChange={handleChange} />
        </div>

        <Button type="submit">שמור</Button>
      </form>
    </Card>
  );
}
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

export default function AddPersonForm() {
  const [formData, setFormData] = useState({
    name: "",
    gender: "",
    birthDate: "",
    birthPlace: "",
    deathDate: "",
    deathPlace: "",
    image: "",
    parents: "",
    spouse: "",
    children: "",
    notes: ""
  });

  const [status, setStatus] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/suggest-person", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        setStatus("ההצעה נשלחה לאישור");
        setFormData({
          name: "",
          gender: "",
          birthDate: "",
          birthPlace: "",
          deathDate: "",
          deathPlace: "",
          image: "",
          parents: "",
          spouse: "",
          children: "",
          notes: ""
        });
      } else {
        setStatus("שגיאה בשליחה");
      }
    } catch (error) {
      console.error("שגיאה בשליחה:", error);
      setStatus("שגיאה בשליחה");
    }
  };
