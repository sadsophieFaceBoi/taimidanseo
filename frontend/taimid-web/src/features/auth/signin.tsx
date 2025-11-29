'use client';

import React from 'react';

export function SigninForm() {
    return (
        <div className="flex flex-col gap-3">
            <button className="rounded-md border border-slate-200 px-4 py-2 font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50">
                Continue with Microsoft
            </button>
            <button className="rounded-md border border-slate-200 px-4 py-2 font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50">
                Continue with Google
            </button>
        </div>
    );
}