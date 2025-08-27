document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch("/api/user");
    if (res.ok) {
      const data = await res.json();
      console.log("✅ מחובר כ:", data.user);

      // מציג אזור פרטי
      document.getElementById("private-section").classList.remove("hidden");
      document.getElementById("logout-btn").classList.remove("hidden");
    } else {
      console.log("❌ לא מחובר");
      document.getElementById("login-warning").classList.remove("hidden");
    }
  } catch (err) {
    console.error("⚠️ בעיית תקשורת:", err);
  }
     <!-- Smartsupp Live Chat script -->
<script type="text/javascript">
var _smartsupp = _smartsupp || {};
_smartsupp.key = 'cd933f1f7259630fc81394b73f12233e0373b6b6';
window.smartsupp||(function(d) {
  var s,c,o=smartsupp=function(){ o._.push(arguments)};o._=[];
  s=d.getElementsByTagName('script')[0];c=d.createElement('script');
  c.type='text/javascript';c.charset='utf-8';c.async=true;
  c.src='https://www.smartsuppchat.com/loader.js?';s.parentNode.insertBefore(c,s);
})(document);
</script>

  // התנתקות
  document.getElementById("logout-btn").addEventListener("click", async () => {
    await fetch("/api/logout", { method: "POST" });
    location.reload();
  });
});
 
