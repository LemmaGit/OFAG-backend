export function checkinAggregation() {
  return [
    {
      $match: { checkinDate: { $exists: true } },
    },
    {
      $lookup: {
        from: "patrons",
        localField: "patronId",
        foreignField: "_id",
        as: "patronDetails",
      },
    },
    {
      $lookup: {
        from: "books",
        localField: "bookId",
        foreignField: "_id",
        as: "bookDetails",
      },
    },
    {
      $lookup: {
        from: "librarians",
        localField: "checkedinBy",
        foreignField: "_id",
        as: "librarianDetails",
      },
    },
    { $unwind: { path: "$patronDetails", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$bookDetails", preserveNullAndEmptyArrays: true } },
    {
      $unwind: { path: "$librarianDetails", preserveNullAndEmptyArrays: true },
    },
    {
      $addFields: {
        patronFullName: {
          $concat: [
            { $ifNull: ["$patronDetails.firstName", ""] },
            " ",
            { $ifNull: ["$patronDetails.lastName", ""] },
          ],
        },
        librarianFullName: {
          $concat: [
            { $ifNull: ["$librarianDetails.firstName", ""] },
            " ",
            { $ifNull: ["$librarianDetails.lastName", ""] },
          ],
        },
        totalFee: {
          $add: [
            {
              $multiply: [
                { $ifNull: ["$overdueFinePerDay", 0] },
                { $ifNull: ["$overdueDays", 0] },
              ],
            },
            { $ifNull: ["$bookConditionDowngradeCharge", 0] },
          ],
        },
      },
    },
    {
      $project: {
        _id: 1,
        bookId: 1,
        checkinDate: 1,
        patronFullName: 1,
        librarianId: 1,
        librarianFullName: 1,
        totalFee: 1,
        bookConditionWhenCheckedout: 1,
        bookConditionWhenCheckedin: 1,
        bookDetails: {
          title: 1,
        },
      },
    },
  ];
}

export function checkoutAggregation() {
  return [
    {
      $match: { checkinDate: { $exists: false } },
    },
    {
      $lookup: {
        from: "patrons",
        localField: "patronId",
        foreignField: "_id",
        as: "patronDetails",
      },
    },
    {
      $lookup: {
        from: "books",
        localField: "bookId",
        foreignField: "_id",
        as: "bookDetails",
      },
    },
    {
      $lookup: {
        from: "librarians",
        localField: "checkedoutBy",
        foreignField: "_id",
        as: "librarianDetails",
      },
    },
    { $unwind: { path: "$patronDetails", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$bookDetails", preserveNullAndEmptyArrays: true } },
    {
      $unwind: { path: "$librarianDetails", preserveNullAndEmptyArrays: true },
    },
    {
      $addFields: {
        patronFullName: {
          $concat: [
            { $ifNull: ["$patronDetails.firstName", ""] },
            " ",
            { $ifNull: ["$patronDetails.lastName", ""] },
          ],
        },
        librarianFullName: {
          $concat: [
            { $ifNull: ["$librarianDetails.firstName", ""] },
            " ",
            { $ifNull: ["$librarianDetails.lastName", ""] },
          ],
        },
        status: {
          $cond: {
            if: { $gt: ["$overdueDays", 0] },
            then: "overdue",
            else: "not overdue",
          },
        },
        overdueFee: {
          $multiply: [
            { $ifNull: ["$overdueFinePerDay", 0] },
            { $ifNull: ["$overdueDays", 0] },
          ],
        },
      },
    },
    {
      $project: {
        _id: 1,
        bookId: 1,
        patronId: 1,
        checkoutDate: 1,
        dueDate: 1,
        newDueDate: 1,
        renewDate: 1,
        patronFullName: 1,
        librarianFullName: 1,
        status: 1,
        overdueFee: 1,
        bookConditionWhenCheckedout: 1,
        // bookConditionWhenCheckedin: 1,
        paymentStatus: 1,
        overdueDays: 1,
        // overdueFineAmount: 1,
        // bookConditionDowngradeCharge: 1,
        // totalFine: 1,
        bookDetails: {
          title: 1,
          // condition: 1,
        },
      },
    },
  ];
}
