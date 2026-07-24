/* =========================================================
   INTERVUE AI — ADMIN DASHBOARD JAVASCRIPT
   ========================================================= */


/* =========================================================
   VIEW INTERVIEW DETAILS
   ========================================================= */

const viewButtons = document.querySelectorAll(".view-btn");


viewButtons.forEach(button => {

    button.addEventListener("click", function () {

        const interviewId = this.dataset.id;


        window.location.href =
            `/admin/interview/${interviewId}`;

    });

});



/* =========================================================
   SEARCH CANDIDATES
   ========================================================= */

const searchBox = document.getElementById("searchBox");


if (searchBox) {

    searchBox.addEventListener("keyup", function () {

        const searchValue =
            this.value.toLowerCase();


        const rows =
            document.querySelectorAll("tbody tr");


        rows.forEach(row => {

            const rowText =
                row.textContent.toLowerCase();


            if (rowText.includes(searchValue)) {

                row.style.display = "";

            }

            else {

                row.style.display = "none";

            }

        });

    });

}